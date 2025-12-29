import { NextResponse } from "next/server";
import { redis, ROOM_TTL } from "@/lib/redis";
import { RoomState, RoomPlayer, generatePlayerId } from "@/lib/roomState";
import { getPusherServer, getRoomChannel, ROOM_EVENTS } from "@/lib/pusher";
import { sanitizeRoomForPlayer } from "@/lib/roomSanitizer";

interface RouteContext {
  params: Promise<{ code: string }>;
}

// GET /api/room/[code]?playerId=xxx - Get room state (sanitized for player)
export async function GET(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get("playerId");
    
    if (!playerId) {
      return NextResponse.json(
        { error: "Player ID is required" },
        { status: 400 }
      );
    }
    
    const roomData = await redis.get(`room:${code.toUpperCase()}`);
    
    if (!roomData) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const room = typeof roomData === "string" ? JSON.parse(roomData) : roomData as RoomState;
    
    // Verify player is in the room
    const playerInRoom = room.players.some((p: RoomPlayer) => p.id === playerId);
    if (!playerInRoom) {
      return NextResponse.json(
        { error: "Player not in room" },
        { status: 403 }
      );
    }
    
    // Return sanitized room state for this player
    const sanitizedRoom = sanitizeRoomForPlayer(room, playerId);
    return NextResponse.json({ room: sanitizedRoom });
  } catch (error) {
    console.error("Error getting room:", error);
    return NextResponse.json(
      { error: "Failed to get room" },
      { status: 500 }
    );
  }
}

// POST /api/room/[code] - Join room
export async function POST(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const body = await request.json();
    const { playerName } = body as { playerName: string };

    if (!playerName || playerName.trim().length === 0) {
      return NextResponse.json(
        { error: "Player name is required" },
        { status: 400 }
      );
    }

    const roomCode = code.toUpperCase();
    const roomData = await redis.get(`room:${roomCode}`);
    
    if (!roomData) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const room = typeof roomData === "string" ? JSON.parse(roomData) : roomData as RoomState;

    // Check if room is still accepting players
    if (room.phase !== "waiting") {
      return NextResponse.json(
        { error: "Game has already started" },
        { status: 400 }
      );
    }

    // Check for duplicate names
    if (room.players.some((p: RoomPlayer) => p.name.toLowerCase() === playerName.trim().toLowerCase())) {
      return NextResponse.json(
        { error: "Name already taken" },
        { status: 400 }
      );
    }

    // Max 10 players
    if (room.players.length >= 10) {
      return NextResponse.json(
        { error: "Room is full" },
        { status: 400 }
      );
    }

    // Add player
    const playerId = generatePlayerId();
    room.players.push({
      id: playerId,
      name: playerName.trim(),
      isAdmin: false,
      isImposter: false,
      hasRevealed: false,
      joinedAt: Date.now(),
    });
    room.updatedAt = Date.now();

    // Update in Redis
    await redis.set(`room:${roomCode}`, JSON.stringify(room), { ex: ROOM_TTL });

    // Broadcast to room via Pusher (notification only, no sensitive data)
    try {
      const pusher = getPusherServer();
      await pusher.trigger(getRoomChannel(roomCode), ROOM_EVENTS.PLAYER_JOINED, { 
        event: "player_joined",
        updatedAt: room.updatedAt,
      });
    } catch (pusherError) {
      console.error("Pusher error:", pusherError);
    }

    // Return sanitized room for the joining player
    const sanitizedRoom = sanitizeRoomForPlayer(room, playerId);
    return NextResponse.json({
      playerId,
      room: sanitizedRoom,
    });
  } catch (error) {
    console.error("Error joining room:", error);
    return NextResponse.json(
      { error: "Failed to join room" },
      { status: 500 }
    );
  }
}

// DELETE /api/room/[code] - Leave room or kick player (admin only)
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get("playerId");
    const adminId = searchParams.get("adminId");

    if (!playerId) {
      return NextResponse.json(
        { error: "Player ID is required" },
        { status: 400 }
      );
    }

    const roomCode = code.toUpperCase();
    const roomData = await redis.get(`room:${roomCode}`);
    
    if (!roomData) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const room = typeof roomData === "string" ? JSON.parse(roomData) : roomData as RoomState;

    // Find player
    const playerIndex = room.players.findIndex((p: RoomPlayer) => p.id === playerId);
    if (playerIndex === -1) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    const player = room.players[playerIndex];

    // If kicking someone else, must be admin
    if (adminId && adminId !== playerId) {
      const admin = room.players.find((p: RoomPlayer) => p.id === adminId);
      if (!admin?.isAdmin) {
        return NextResponse.json(
          { error: "Only admin can kick players" },
          { status: 403 }
        );
      }
    }

    // Remove player
    room.players.splice(playerIndex, 1);

    // If admin left, assign new admin or delete room
    if (player.isAdmin) {
      if (room.players.length > 0) {
        room.players[0].isAdmin = true;
      } else {
        // Delete room
        await redis.del(`room:${roomCode}`);
        return NextResponse.json({ deleted: true });
      }
    }

    room.updatedAt = Date.now();
    await redis.set(`room:${roomCode}`, JSON.stringify(room), { ex: ROOM_TTL });

    // Broadcast to room via Pusher (notification only, no sensitive data)
    try {
      const pusher = getPusherServer();
      await pusher.trigger(getRoomChannel(roomCode), ROOM_EVENTS.PLAYER_LEFT, { 
        event: "player_left",
        updatedAt: room.updatedAt,
      });
    } catch (pusherError) {
      console.error("Pusher error:", pusherError);
    }

    // Return sanitized room (waiting phase, so no sensitive data anyway)
    const sanitizedRoom = sanitizeRoomForPlayer(room, playerId);
    return NextResponse.json({ room: sanitizedRoom });
  } catch (error) {
    console.error("Error leaving room:", error);
    return NextResponse.json(
      { error: "Failed to leave room" },
      { status: 500 }
    );
  }
}


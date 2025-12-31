import { NextResponse } from "next/server";
import { redis, ROOM_TTL } from "@/lib/redis";
import { RoomState, RoomPlayer } from "@/lib/roomState";
import { getPusherServer, getRoomChannel, ROOM_EVENTS } from "@/lib/pusher";

interface RouteContext {
  params: Promise<{ code: string }>;
}

// POST /api/room/[code]/leave?playerId=xxx - Leave room (for sendBeacon)
export async function POST(request: Request, context: RouteContext) {
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

    // Remove player
    room.players.splice(playerIndex, 1);

    // If admin left, assign new admin or delete room
    if (player.isAdmin) {
      if (room.players.length > 0) {
        // Find the oldest player (by joinedAt) to become admin
        const oldestPlayer = room.players.reduce((oldest: RoomPlayer, p: RoomPlayer) => 
          (p.joinedAt || 0) < (oldest.joinedAt || 0) ? p : oldest
        , room.players[0]);
        oldestPlayer.isAdmin = true;
      } else {
        // Delete room
        await redis.del(`room:${roomCode}`);
        return NextResponse.json({ deleted: true });
      }
    }

    room.updatedAt = Date.now();
    await redis.set(`room:${roomCode}`, JSON.stringify(room), { ex: ROOM_TTL });

    // Broadcast to room via Pusher
    try {
      const pusher = getPusherServer();
      await pusher.trigger(getRoomChannel(roomCode), ROOM_EVENTS.PLAYER_LEFT, { 
        event: "player_left",
        kickedPlayerId: playerId,
        updatedAt: room.updatedAt,
      });
    } catch (pusherError) {
      console.error("Pusher error:", pusherError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error leaving room:", error);
    return NextResponse.json(
      { error: "Failed to leave room" },
      { status: 500 }
    );
  }
}


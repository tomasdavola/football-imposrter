import { NextResponse } from "next/server";
import { redis, ROOM_TTL } from "@/lib/redis";
import { 
  RoomState, 
  RoomPlayer,
  rollForTrollEvent, 
  assignRoles, 
  selectStartingPlayer,
} from "@/lib/roomState";
import { getRandomPlayer, getRandomPlayers } from "@/lib/players";
import { getPusherServer, getRoomChannel, ROOM_EVENTS } from "@/lib/pusher";
import { sanitizeRoomForPlayer } from "@/lib/roomSanitizer";

interface RouteContext {
  params: Promise<{ code: string }>;
}

type ActionType = 
  | "start"       // Admin starts the game
  | "reveal"      // Player reveals their role
  | "discussion"  // Move to discussion phase
  | "vote"        // Cast a vote
  | "endVoting"   // Admin ends voting
  | "results"     // Move to results
  | "playAgain"   // Start a new game with same players
  | "updateSettings"; // Update room settings

interface ActionBody {
  action: ActionType;
  playerId: string;
  votedFor?: string;
  settings?: RoomState["settings"];
}

// POST /api/room/[code]/action - Perform game action
export async function POST(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const body = await request.json() as ActionBody;
    const { action, playerId, votedFor, settings } = body;

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

    // Verify player exists
    const player = room.players.find((p: RoomPlayer) => p.id === playerId);
    if (!player) {
      return NextResponse.json(
        { error: "Player not found in room" },
        { status: 404 }
      );
    }

    // Handle different actions
    switch (action) {
      case "start": {
        // Only admin can start
        if (!player.isAdmin) {
          return NextResponse.json(
            { error: "Only admin can start the game" },
            { status: 403 }
          );
        }

        // Need at least 3 players
        if (room.players.length < 3) {
          return NextResponse.json(
            { error: "Need at least 3 players to start" },
            { status: 400 }
          );
        }

        // Roll for troll event
        const trollEvent = rollForTrollEvent(room.settings.trollChance);
        room.trollEvent = trollEvent;

        // Get secret player
        const secretPlayer = await getRandomPlayer(room.settings.sourceSelection);
        room.secretPlayer = secretPlayer;

        // For "differentPlayers" troll mode, assign individual players
        if (trollEvent === "differentPlayers") {
          const differentPlayers = await getRandomPlayers(room.players.length, room.settings.sourceSelection);
          room.players.forEach((p: RoomPlayer, i: number) => {
            p.secretPlayer = differentPlayers[i] || secretPlayer;
          });
        }

        // Assign roles
        room.players = assignRoles(room.players, room.settings.imposterCount, trollEvent);

        // Move to revealing phase
        room.phase = "revealing";
        room.updatedAt = Date.now();
        break;
      }

      case "reveal": {
        // Mark player as revealed
        const playerToReveal = room.players.find((p: RoomPlayer) => p.id === playerId);
        if (playerToReveal) {
          playerToReveal.hasRevealed = true;
        }
        room.updatedAt = Date.now();
        break;
      }

      case "discussion": {
        // Only admin can start discussion
        if (!player.isAdmin) {
          return NextResponse.json(
            { error: "Only admin can start discussion" },
            { status: 403 }
          );
        }

        // All players must have revealed
        const allRevealed = room.players.every((p: RoomPlayer) => p.hasRevealed);
        if (!allRevealed) {
          return NextResponse.json(
            { error: "Not all players have revealed their roles" },
            { status: 400 }
          );
        }

        // Select starting player
        room.startingPlayerId = selectStartingPlayer(
          room.players, 
          room.settings.imposterLessLikelyToStart
        );

        // Set discussion end time if timer enabled
        if (room.settings.discussionTime > 0) {
          room.discussionEndTime = Date.now() + (room.settings.discussionTime * 1000);
        }

        room.phase = "discussion";
        room.updatedAt = Date.now();
        break;
      }

      case "vote": {
        if (room.phase !== "voting") {
          return NextResponse.json(
            { error: "Not in voting phase" },
            { status: 400 }
          );
        }

        if (!votedFor) {
          return NextResponse.json(
            { error: "Must specify who to vote for" },
            { status: 400 }
          );
        }

        // Record vote
        const votingPlayer = room.players.find((p: RoomPlayer) => p.id === playerId);
        if (votingPlayer) {
          votingPlayer.votedFor = votedFor;
        }
        room.updatedAt = Date.now();
        break;
      }

      case "endVoting": {
        // Only admin can end voting
        if (!player.isAdmin) {
          return NextResponse.json(
            { error: "Only admin can end voting" },
            { status: 403 }
          );
        }

        // Move to results
        room.phase = "results";
        room.updatedAt = Date.now();
        break;
      }

      case "results": {
        // Only admin can skip to results
        if (!player.isAdmin) {
          return NextResponse.json(
            { error: "Only admin can skip to results" },
            { status: 403 }
          );
        }

        room.phase = "results";
        room.updatedAt = Date.now();
        break;
      }

      case "playAgain": {
        // Only admin can start new game
        if (!player.isAdmin) {
          return NextResponse.json(
            { error: "Only admin can start new game" },
            { status: 403 }
          );
        }

        // Reset for new game
        room.phase = "waiting";
        room.secretPlayer = undefined;
        room.trollEvent = null;
        room.startingPlayerId = undefined;
        room.discussionEndTime = undefined;
        room.players.forEach((p: RoomPlayer) => {
          p.isImposter = false;
          p.hasRevealed = false;
          p.votedFor = undefined;
          p.secretPlayer = undefined;
        });
        room.updatedAt = Date.now();
        break;
      }

      case "updateSettings": {
        // Only admin can update settings
        if (!player.isAdmin) {
          return NextResponse.json(
            { error: "Only admin can update settings" },
            { status: 403 }
          );
        }

        if (room.phase !== "waiting") {
          return NextResponse.json(
            { error: "Can only update settings before game starts" },
            { status: 400 }
          );
        }

        if (settings) {
          room.settings = settings;
        }
        room.updatedAt = Date.now();
        break;
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }

    // Save updated room
    await redis.set(`room:${roomCode}`, JSON.stringify(room), { ex: ROOM_TTL });

    // Broadcast notification to all clients (no sensitive data - clients will fetch their view)
    try {
      const pusher = getPusherServer();
      const eventType = action === "start" ? ROOM_EVENTS.GAME_STARTED 
                      : action === "reveal" ? ROOM_EVENTS.PLAYER_REVEALED
                      : ROOM_EVENTS.ROOM_UPDATED;
      // Only send notification with minimal info - no room data
      await pusher.trigger(getRoomChannel(roomCode), eventType, { 
        event: action,
        phase: room.phase,
        updatedAt: room.updatedAt,
      });
    } catch (pusherError) {
      console.error("Pusher error:", pusherError);
    }

    // Return sanitized room state for the requesting player
    const sanitizedRoom = sanitizeRoomForPlayer(room, playerId);
    return NextResponse.json({ room: sanitizedRoom });
  } catch (error) {
    console.error("Error performing action:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}


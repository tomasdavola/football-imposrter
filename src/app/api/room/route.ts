import { NextResponse } from "next/server";
import { redis, ROOM_TTL } from "@/lib/redis";
import { 
  RoomState, 
  RoomSettings, 
  generateRoomCode, 
  createInitialRoomState 
} from "@/lib/roomState";

// POST /api/room - Create a new room
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adminName, settings } = body as { 
      adminName: string; 
      settings: RoomSettings;
    };

    if (!adminName || adminName.trim().length === 0) {
      return NextResponse.json(
        { error: "Admin name is required" },
        { status: 400 }
      );
    }

    // Generate unique room code
    let code: string;
    let attempts = 0;
    do {
      code = generateRoomCode();
      const existing = await redis.get(`room:${code}`);
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return NextResponse.json(
        { error: "Could not generate unique room code" },
        { status: 500 }
      );
    }

    // Create room state
    const roomState = createInitialRoomState(code, adminName.trim(), settings);
    
    // Store in Redis
    await redis.set(`room:${code}`, JSON.stringify(roomState), { ex: ROOM_TTL });

    // Return room info and admin player ID
    return NextResponse.json({
      code,
      playerId: roomState.players[0].id,
      room: roomState,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}


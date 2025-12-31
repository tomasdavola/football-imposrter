import Pusher from "pusher";
import PusherClient from "pusher-js";

// Server-side Pusher instance
let pusherServer: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return pusherServer;
}

// Client-side Pusher instance (singleton)
let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (typeof window === "undefined") {
    throw new Error("getPusherClient can only be called on the client side");
  }
  
  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return pusherClient;
}

// Channel name for a room
export function getRoomChannel(roomCode: string): string {
  return `room-${roomCode.toUpperCase()}`;
}

// Event types
export const ROOM_EVENTS = {
  ROOM_UPDATED: "room-updated",
  PLAYER_JOINED: "player-joined",
  PLAYER_LEFT: "player-left",
  GAME_STARTED: "game-started",
  PLAYER_REVEALED: "player-revealed",
  PHASE_CHANGED: "phase-changed",
} as const;


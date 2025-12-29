import { FootballPlayer, PlayerSourceSelection } from "./players";

// Room phases
export type RoomPhase = 
  | "waiting"      // Waiting for players to join
  | "ready"        // All players joined, waiting to start
  | "revealing"    // Players viewing their roles
  | "discussion"   // Discussion phase
  | "voting"       // Voting phase  
  | "results";     // Game over, showing results

// Player in a room
export interface RoomPlayer {
  id: string;           // Unique player ID (generated on join)
  name: string;         // Player name
  isAdmin: boolean;     // Is this the room creator?
  isImposter: boolean;  // Is this player an imposter?
  hasRevealed: boolean; // Has player seen their role?
  votedFor?: string;    // ID of player they voted for
  secretPlayer?: FootballPlayer; // For "differentPlayers" troll mode
  joinedAt: number;     // Timestamp when joined
}

// Troll event types
export type TrollEvent = "extraImposter" | "allImposters" | "noImposters" | "differentPlayers" | null;

// Room settings
export interface RoomSettings {
  discussionTime: number;     // Discussion time in seconds (0 = no timer)
  imposterCount: number;      // Number of imposters
  imposterLessLikelyToStart: boolean;
  trollChance: number;        // 0-100
  sourceSelection: PlayerSourceSelection;
}

// Full room state stored in Redis
export interface RoomState {
  code: string;               // 6-character room code
  phase: RoomPhase;
  players: RoomPlayer[];
  settings: RoomSettings;
  secretPlayer?: FootballPlayer;  // The secret football player
  trollEvent: TrollEvent;
  startingPlayerId?: string;  // ID of player who starts discussion
  discussionEndTime?: number; // Timestamp when discussion ends
  createdAt: number;
  updatedAt: number;
}

// Generate a random 6-character room code
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars (0, O, 1, I)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Generate a unique player ID
export function generatePlayerId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Create initial room state
export function createInitialRoomState(code: string, adminName: string, settings: RoomSettings): RoomState {
  const adminId = generatePlayerId();
  
  return {
    code,
    phase: "waiting",
    players: [{
      id: adminId,
      name: adminName,
      isAdmin: true,
      isImposter: false,
      hasRevealed: false,
      joinedAt: Date.now(),
    }],
    settings,
    trollEvent: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// Check if a troll event should happen
export function rollForTrollEvent(trollChance: number): TrollEvent {
  if (trollChance <= 0) return null;
  
  const roll = Math.random() * 100;
  if (roll >= trollChance) return null;
  
  // Random troll event
  const events: TrollEvent[] = ["extraImposter", "allImposters", "noImposters", "differentPlayers"];
  return events[Math.floor(Math.random() * events.length)];
}

// Assign roles to players
export function assignRoles(
  players: RoomPlayer[], 
  imposterCount: number, 
  trollEvent: TrollEvent
): RoomPlayer[] {
  const updatedPlayers = [...players];
  
  // Reset all roles
  updatedPlayers.forEach(p => {
    p.isImposter = false;
    p.hasRevealed = false;
    p.votedFor = undefined;
  });

  let actualImposterCount = imposterCount;
  
  // Handle troll events
  switch (trollEvent) {
    case "extraImposter":
      actualImposterCount = Math.min(imposterCount + 1, players.length - 1);
      break;
    case "allImposters":
      updatedPlayers.forEach(p => p.isImposter = true);
      return updatedPlayers;
    case "noImposters":
      return updatedPlayers; // No one is imposter
    case "differentPlayers":
      // Each player gets their own secret player (handled separately)
      break;
  }

  // Randomly select imposters
  const shuffledIndices = [...Array(players.length).keys()].sort(() => Math.random() - 0.5);
  for (let i = 0; i < actualImposterCount && i < shuffledIndices.length; i++) {
    updatedPlayers[shuffledIndices[i]].isImposter = true;
  }

  return updatedPlayers;
}

// Select starting player
export function selectStartingPlayer(
  players: RoomPlayer[], 
  imposterLessLikely: boolean
): string {
  if (!imposterLessLikely) {
    // Random selection
    return players[Math.floor(Math.random() * players.length)].id;
  }

  // Imposters have 50% less chance
  const weights = players.map(p => p.isImposter ? 0.5 : 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  let random = Math.random() * totalWeight;
  for (let i = 0; i < players.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return players[i].id;
    }
  }
  
  return players[0].id;
}

// Get vote results
export function getVoteResults(players: RoomPlayer[]): { eliminatedId: string | null; votes: Record<string, number> } {
  const votes: Record<string, number> = {};
  
  players.forEach(p => {
    if (p.votedFor) {
      votes[p.votedFor] = (votes[p.votedFor] || 0) + 1;
    }
  });

  // Find player with most votes
  let maxVotes = 0;
  let eliminatedId: string | null = null;
  let tie = false;

  Object.entries(votes).forEach(([playerId, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      eliminatedId = playerId;
      tie = false;
    } else if (count === maxVotes) {
      tie = true;
    }
  });

  // No elimination on tie
  if (tie) {
    eliminatedId = null;
  }

  return { eliminatedId, votes };
}


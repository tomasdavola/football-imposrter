import { FootballPlayer, PlayerSourceSelection, getDefaultSourceSelection } from "./players";

export type GamePhase = 
  | "setup"
  | "passing"
  | "reveal"
  | "discussion"
  | "voting"
  | "results";

export type TrollEvent = 
  | null 
  | "extraImposter" 
  | "allImposters" 
  | "noImposters" 
  | "differentPlayers";

export type TrollEventType = Exclude<TrollEvent, null>;

export const TROLL_EVENT_INFO: Record<TrollEventType, { name: string; emoji: string; description: string }> = {
  extraImposter: { name: "Extra Imposter", emoji: "👥", description: "+1 imposter" },
  allImposters: { name: "All Imposters", emoji: "🔴", description: "Everyone is an imposter" },
  noImposters: { name: "No Imposters", emoji: "✅", description: "No imposters at all" },
  differentPlayers: { name: "Different Players", emoji: "🎭", description: "Each player gets a different footballer" },
};

export interface Player {
  id: number;
  name: string;
  isImposter: boolean;
  secretPlayer?: FootballPlayer; // For differentPlayers troll mode
  votedFor?: number; // Player ID they voted for
}

export interface GameOptions {
  noTimer: boolean;
  skipVoting: boolean;
  imposterCount: number;
  // Player source settings
  sourceSelection: PlayerSourceSelection;
  // Advanced settings
  imposterLessLikelyToStart: boolean;
  trollChance: number; // 0-100 percent chance of troll event
  enabledTrollEvents: TrollEventType[]; // Which troll events can occur
}

export const ALL_TROLL_EVENTS: TrollEventType[] = ["extraImposter", "allImposters", "noImposters", "differentPlayers"];

export interface GameState {
  phase: GamePhase;
  players: Player[];
  secretPlayer: FootballPlayer | null;
  imposterIndices: number[];
  currentPlayerIndex: number; // For role reveal phase
  startingPlayerIndex: number; // Who starts the discussion
  discussionTimeSeconds: number;
  votes: Map<number, number>; // voterId -> votedForId
  eliminatedPlayerId: number | null;
  options: GameOptions;
  trollEvent: TrollEvent;
}

export function createInitialGameState(): GameState {
  return {
    phase: "setup",
    players: [],
    secretPlayer: null,
    imposterIndices: [],
    currentPlayerIndex: 0,
    startingPlayerIndex: 0,
    discussionTimeSeconds: 180, // 3 minutes default
    votes: new Map(),
    eliminatedPlayerId: null,
    options: {
      noTimer: false,
      skipVoting: true,
      imposterCount: 1,
      sourceSelection: getDefaultSourceSelection(),
      imposterLessLikelyToStart: false,
      trollChance: 25,
      enabledTrollEvents: ALL_TROLL_EVENTS,
    },
    trollEvent: null,
  };
}

export function setupGame(
  playerNames: string[],
  secretPlayer: FootballPlayer,
  discussionTime: number,
  options: GameOptions,
  additionalPlayers?: FootballPlayer[] // For differentPlayers troll mode
): GameState {
  let trollEvent: TrollEvent = null;
  let actualImposterCount = options.imposterCount;
  
  // Check for troll mode events based on trollChance (0-100)
  const enabledEvents = options.enabledTrollEvents || ALL_TROLL_EVENTS;
  if (options.trollChance > 0 && enabledEvents.length > 0 && Math.random() < options.trollChance / 100) {
    // Pick randomly from enabled events
    const selectedEvent = enabledEvents[Math.floor(Math.random() * enabledEvents.length)];
    trollEvent = selectedEvent;
    
    // Apply the effect based on selected event
    switch (selectedEvent) {
      case "extraImposter":
        actualImposterCount = Math.min(options.imposterCount + 1, playerNames.length - 1);
        break;
      case "allImposters":
        actualImposterCount = playerNames.length;
        break;
      case "noImposters":
        actualImposterCount = 0;
        break;
      case "differentPlayers":
        // Imposter count stays the same, but each player gets a different footballer
        break;
    }
  }
  
  // Pick random imposter indices
  const imposterIndices: number[] = [];
  const availableIndices = playerNames.map((_, i) => i);
  
  for (let i = 0; i < actualImposterCount; i++) {
    if (availableIndices.length === 0) break;
    const randomIndex = Math.floor(Math.random() * availableIndices.length);
    imposterIndices.push(availableIndices[randomIndex]);
    availableIndices.splice(randomIndex, 1);
  }
  
  const players: Player[] = playerNames.map((name, index) => ({
    id: index,
    name,
    isImposter: imposterIndices.includes(index),
    // For differentPlayers mode, assign unique players to non-imposters
    secretPlayer: trollEvent === "differentPlayers" && !imposterIndices.includes(index) && additionalPlayers
      ? additionalPlayers[index % additionalPlayers.length]
      : undefined,
  }));

  // Pick a random starting player for discussion
  let startingPlayerIndex: number;
  
  if (options.imposterLessLikelyToStart && imposterIndices.length > 0 && imposterIndices.length < playerNames.length) {
    // Imposters have half the chance of starting
    // Weight: non-imposters get weight 2, imposters get weight 1
    const weights: number[] = playerNames.map((_, i) => imposterIndices.includes(i) ? 1 : 2);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    startingPlayerIndex = 0;
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        startingPlayerIndex = i;
        break;
      }
    }
  } else {
    startingPlayerIndex = Math.floor(Math.random() * playerNames.length);
  }

  return {
    phase: "passing",
    players,
    secretPlayer,
    imposterIndices,
    currentPlayerIndex: 0,
    startingPlayerIndex,
    discussionTimeSeconds: discussionTime,
    votes: new Map(),
    eliminatedPlayerId: null,
    options,
    trollEvent,
  };
}

export function calculateVotes(players: Player[]): { playerId: number; votes: number }[] {
  const voteCounts = new Map<number, number>();
  
  // Initialize vote counts
  players.forEach(p => voteCounts.set(p.id, 0));
  
  // Count votes
  players.forEach(p => {
    if (p.votedFor !== undefined) {
      voteCounts.set(p.votedFor, (voteCounts.get(p.votedFor) || 0) + 1);
    }
  });
  
  // Convert to array and sort by votes descending
  return Array.from(voteCounts.entries())
    .map(([playerId, votes]) => ({ playerId, votes }))
    .sort((a, b) => b.votes - a.votes);
}

export function getEliminatedPlayer(players: Player[]): number | null {
  const results = calculateVotes(players);
  if (results.length === 0) return null;
  
  // Check for tie at the top
  const topVotes = results[0].votes;
  const topPlayers = results.filter(r => r.votes === topVotes);
  
  // If tie, randomly pick one (or could return null for no elimination)
  if (topPlayers.length > 1) {
    return topPlayers[Math.floor(Math.random() * topPlayers.length)].playerId;
  }
  
  return results[0].playerId;
}


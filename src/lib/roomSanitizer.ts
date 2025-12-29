import { RoomState, RoomPlayer } from "./roomState";

/**
 * Sanitizes room state to only include information the requesting player should see.
 * 
 * Rules:
 * - During "waiting" phase: No sensitive data exists yet
 * - During "revealing" phase: 
 *   - Player can only see their own role (isImposter)
 *   - Imposters don't see the secret player
 *   - Non-imposters see the secret player
 * - During "discussion" phase: Same as revealing
 * - During "voting" phase: Same as revealing  
 * - During "results" phase: Everything is revealed
 */
export function sanitizeRoomForPlayer(room: RoomState, playerId: string): RoomState {
  // During waiting phase, no sensitive data
  if (room.phase === "waiting") {
    return room;
  }

  // During results phase, reveal everything
  if (room.phase === "results") {
    return room;
  }

  // Find the requesting player
  const requestingPlayer = room.players.find(p => p.id === playerId);
  if (!requestingPlayer) {
    // Unknown player - return minimal info
    return sanitizeForSpectator(room);
  }

  const isImposter = requestingPlayer.isImposter;

  // Sanitize player list - hide other players' imposter status
  const sanitizedPlayers: RoomPlayer[] = room.players.map(player => {
    if (player.id === playerId) {
      // Current player sees their own full info
      return player;
    }

    // Other players - hide sensitive info
    return {
      ...player,
      isImposter: false, // Hide imposter status from others
      secretPlayer: undefined, // Hide individual secret players (for differentPlayers mode)
      votedFor: room.phase === "voting" ? undefined : player.votedFor, // Hide votes until results
    };
  });

  // Sanitize secret player based on role
  let sanitizedSecretPlayer = room.secretPlayer;
  if (isImposter) {
    // Imposters don't know the secret player
    sanitizedSecretPlayer = undefined;
  }

  // Sanitize troll event info
  // Don't reveal troll event until results (adds to the surprise)
  // Exception: "differentPlayers" mode - players need to know they each have different players
  let sanitizedTrollEvent = room.trollEvent;
  if (room.trollEvent) {
    sanitizedTrollEvent = null;
  }

  return {
    ...room,
    players: sanitizedPlayers,
    secretPlayer: sanitizedSecretPlayer,
    trollEvent: sanitizedTrollEvent,
  };
}

/**
 * For spectators or unknown players - minimal info only
 */
function sanitizeForSpectator(room: RoomState): RoomState {
  const sanitizedPlayers: RoomPlayer[] = room.players.map(player => ({
    ...player,
    isImposter: false,
    secretPlayer: undefined,
    votedFor: undefined,
  }));

  return {
    ...room,
    players: sanitizedPlayers,
    secretPlayer: undefined,
    trollEvent: null,
  };
}

/**
 * Creates player-specific room states for broadcasting.
 * Returns a map of playerId -> sanitized room state
 */
export function createPlayerSpecificBroadcasts(room: RoomState): Map<string, RoomState> {
  const broadcasts = new Map<string, RoomState>();
  
  for (const player of room.players) {
    broadcasts.set(player.id, sanitizeRoomForPlayer(room, player.id));
  }
  
  return broadcasts;
}


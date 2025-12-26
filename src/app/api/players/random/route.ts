import { NextResponse } from "next/server";

const THESPORTSDB_BASE_URL = "https://www.thesportsdb.com/api/v1/json/3";

export interface GamePlayer {
  name: string;
  team: string;
  nationality: string;
  position: string;
  photo: string | null;
  hint?: string;
}

interface CachedPlayer {
  id: string;
  name: string;
  team: string;
  nationality: string;
  position: string;
  photo: string | null;
  teamBadge: string | null;
}

interface TheSportsDBPlayer {
  idPlayer: string;
  strPlayer: string;
  strThumb: string | null;
  strCutout: string | null;
  strNationality: string;
  strPosition: string;
  strTeam: string;
  strDescriptionEN: string | null;
}

interface TheSportsDBTeam {
  idTeam: string;
  strTeam: string;
  strBadge: string | null;
}

// Top teams to fetch players from dynamically
const TOP_TEAM_NAMES = [
  "Manchester City",
  "Real Madrid",
  "Barcelona",
  "Bayern Munich",
  "Liverpool",
  "Arsenal",
  "Chelsea",
  "Manchester United",
  "Paris Saint-Germain",
  "Juventus",
  "Inter Milan",
  "AC Milan",
  "Borussia Dortmund",
  "Atletico Madrid",
  "Tottenham",
];

// Cache for players
let cachedPlayers: CachedPlayer[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function getTeamPlayers(teamName: string): Promise<CachedPlayer[]> {
  try {
    const teamResponse = await fetch(
      `${THESPORTSDB_BASE_URL}/searchteams.php?t=${encodeURIComponent(teamName)}`,
      { next: { revalidate: 3600 } }
    );

    if (!teamResponse.ok) return [];

    const teamData = await teamResponse.json();
    if (!teamData.teams || teamData.teams.length === 0) return [];

    const team = teamData.teams[0] as TheSportsDBTeam;

    const playersResponse = await fetch(
      `${THESPORTSDB_BASE_URL}/lookup_all_players.php?id=${team.idTeam}`,
      { next: { revalidate: 3600 } }
    );

    if (!playersResponse.ok) return [];

    const playersData = await playersResponse.json();
    if (!playersData.player) return [];

    return playersData.player.map((p: TheSportsDBPlayer): CachedPlayer => ({
      id: p.idPlayer,
      name: p.strPlayer,
      team: team.strTeam,
      nationality: p.strNationality || "Unknown",
      position: p.strPosition || "Unknown",
      photo: p.strCutout || p.strThumb || null,
      teamBadge: team.strBadge,
    }));
  } catch {
    return [];
  }
}

async function fetchAllPlayers(): Promise<CachedPlayer[]> {
  // Check cache
  if (cachedPlayers.length > 0 && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedPlayers;
  }

  console.log("Fetching fresh player data for random endpoint...");

  const teamPromises = TOP_TEAM_NAMES.map(name => getTeamPlayers(name));
  const results = await Promise.all(teamPromises);

  const allPlayers = results.flat();
  const uniquePlayers = new Map<string, CachedPlayer>();

  for (const player of allPlayers) {
    if (player.photo && !uniquePlayers.has(player.id)) {
      uniquePlayers.set(player.id, player);
    }
  }

  cachedPlayers = Array.from(uniquePlayers.values());
  cacheTimestamp = Date.now();

  console.log(`Cached ${cachedPlayers.length} players for random endpoint`);

  return cachedPlayers;
}

// GET /api/players/random - Get random player(s) for the game
// Query params:
//   - count: Number of random players to return (default: 1)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const count = Math.min(parseInt(searchParams.get("count") || "1", 10), 100);

  try {
    // Fetch all players from top teams
    const allPlayers = await fetchAllPlayers();

    if (allPlayers.length === 0) {
      return NextResponse.json(
        { error: "No players available" },
        { status: 503 }
      );
    }

    // Shuffle and pick random players
    const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, allPlayers.length));

    // Convert to GamePlayer format
    const players: GamePlayer[] = selected.map(p => ({
      name: p.name,
      team: p.team,
      nationality: p.nationality,
      position: p.position,
      photo: p.photo,
    }));

    if (count === 1 && players.length > 0) {
      return NextResponse.json({ player: players[0] });
    }

    return NextResponse.json({
      players,
      total: allPlayers.length,
      returned: players.length,
    });
  } catch (error) {
    console.error("Error in random players API:", error);
    return NextResponse.json(
      { error: "Failed to fetch random players" },
      { status: 500 }
    );
  }
}


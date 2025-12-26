import { NextResponse } from "next/server";

// TheSportsDB free API - no key required for basic usage
const THESPORTSDB_BASE_URL = "https://www.thesportsdb.com/api/v1/json/3";

export interface ExternalPlayer {
  id: string;
  name: string;
  photo: string | null;
  nationality: string;
  position: string;
  team: string;
  teamBadge: string | null;
  nationalityFlag: string | null;
  dateOfBirth: string | null;
}

interface TheSportsDBPlayer {
  idPlayer: string;
  strPlayer: string;
  strThumb: string | null;
  strCutout: string | null;
  strNationality: string;
  strPosition: string;
  strTeam: string;
  strTeamBadge?: string | null;
  strNationalityFlag?: string | null;
  dateBorn: string | null;
}

interface TheSportsDBTeam {
  idTeam: string;
  strTeam: string;
  strBadge: string | null;
}

// Top teams to fetch players from (team IDs from TheSportsDB)
// These are stable IDs that won't change - the players within them update automatically
const TOP_TEAM_IDS = [
  "133604", // Manchester City
  "133738", // Real Madrid
  "133739", // Barcelona  
  "133632", // Bayern Munich
  "133602", // Liverpool
  "133604", // Arsenal (using different lookup)
  "133613", // Chelsea
  // "133603", // Manchester United
  "133714", // Paris Saint-Germain
  "133676", // Juventus
  // "133670", // Inter Milan
  // "133671", // AC Milan
  // "133636", // Borussia Dortmund
  // "133703", // Atletico Madrid
];

// Fallback: Top team names to search (in case IDs change)
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

// Cache for players fetched from teams
let cachedPlayers: ExternalPlayer[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function searchPlayer(playerName: string): Promise<ExternalPlayer | null> {
  try {
    const response = await fetch(
      `${THESPORTSDB_BASE_URL}/searchplayers.php?p=${encodeURIComponent(playerName)}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      console.error(`Failed to fetch player ${playerName}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.player || data.player.length === 0) {
      return null;
    }

    // Find the football/soccer player (filter by sport)
    const soccerPlayer = data.player.find(
      (p: TheSportsDBPlayer & { strSport?: string }) => 
        p.strSport === "Soccer" || !p.strSport
    ) as TheSportsDBPlayer | undefined;

    if (!soccerPlayer) {
      return null;
    }

    return {
      id: soccerPlayer.idPlayer,
      name: soccerPlayer.strPlayer,
      photo: soccerPlayer.strCutout || soccerPlayer.strThumb || null,
      nationality: soccerPlayer.strNationality || "Unknown",
      position: soccerPlayer.strPosition || "Unknown",
      team: soccerPlayer.strTeam || "Unknown",
      teamBadge: null, // Will fetch separately if needed
      nationalityFlag: null,
      dateOfBirth: soccerPlayer.dateBorn,
    };
  } catch (error) {
    console.error(`Error fetching player ${playerName}:`, error);
    return null;
  }
}

async function getTeamPlayers(teamName: string): Promise<ExternalPlayer[]> {
  try {
    // First, search for the team
    const teamResponse = await fetch(
      `${THESPORTSDB_BASE_URL}/searchteams.php?t=${encodeURIComponent(teamName)}`,
      { next: { revalidate: 3600 } }
    );

    if (!teamResponse.ok) {
      return [];
    }

    const teamData = await teamResponse.json();
    if (!teamData.teams || teamData.teams.length === 0) {
      return [];
    }

    const team = teamData.teams[0] as TheSportsDBTeam;

    // Then get all players for that team
    const playersResponse = await fetch(
      `${THESPORTSDB_BASE_URL}/lookup_all_players.php?id=${team.idTeam}`,
      { next: { revalidate: 3600 } }
    );

    if (!playersResponse.ok) {
      return [];
    }

    const playersData = await playersResponse.json();
    if (!playersData.player) {
      return [];
    }

    return playersData.player.map((p: TheSportsDBPlayer): ExternalPlayer => ({
      id: p.idPlayer,
      name: p.strPlayer,
      photo: p.strCutout || p.strThumb || null,
      nationality: p.strNationality || "Unknown",
      position: p.strPosition || "Unknown",
      team: team.strTeam,
      teamBadge: team.strBadge,
      nationalityFlag: null,
      dateOfBirth: p.dateBorn,
    }));
  } catch (error) {
    console.error(`Error fetching team ${teamName}:`, error);
    return [];
  }
}

// Fetch players from all top teams dynamically
async function fetchTopPlayers(): Promise<ExternalPlayer[]> {
  // Check cache first
  if (cachedPlayers.length > 0 && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedPlayers;
  }

  console.log("Fetching fresh player data from top teams...");
  
  // Fetch players from each top team in parallel
  const teamPromises = TOP_TEAM_NAMES.map(teamName => getTeamPlayers(teamName));
  const results = await Promise.all(teamPromises);
  
  // Flatten and deduplicate players by ID
  const allPlayers = results.flat();
  const uniquePlayers = new Map<string, ExternalPlayer>();
  
  for (const player of allPlayers) {
    // Only include players with photos for better game experience
    if (player.photo && !uniquePlayers.has(player.id)) {
      uniquePlayers.set(player.id, player);
    }
  }
  
  // Convert to array and cache
  cachedPlayers = Array.from(uniquePlayers.values());
  cacheTimestamp = Date.now();
  
  console.log(`Cached ${cachedPlayers.length} players from ${TOP_TEAM_NAMES.length} teams`);
  
  return cachedPlayers;
}

// GET /api/players - Get list of players
// Query params:
//   - search: Search for a specific player by name
//   - team: Get all players from a specific team
//   - count: Number of players to return (default: 10)
//   - all: If true, return all cached players
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const team = searchParams.get("team");
  const all = searchParams.get("all") === "true";
  const count = parseInt(searchParams.get("count") || "10", 10);

  try {
    // Search for a specific player
    if (search) {
      const player = await searchPlayer(search);
      if (player) {
        return NextResponse.json({ players: [player] });
      }
      return NextResponse.json({ players: [], message: "Player not found" });
    }

    // Get players from a specific team
    if (team) {
      const players = await getTeamPlayers(team);
      return NextResponse.json({ 
        players: players.slice(0, count),
        total: players.length 
      });
    }

    // Fetch players dynamically from top teams
    const allPlayers = await fetchTopPlayers();
    
    // Return all players if requested
    if (all) {
      return NextResponse.json({
        players: allPlayers,
        total: allPlayers.length,
        cached: cacheTimestamp > 0,
        teamsUsed: TOP_TEAM_NAMES,
      });
    }
    
    // Default: Return random selection
    const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
    const players = shuffled.slice(0, Math.min(count, allPlayers.length));

    return NextResponse.json({
      players,
      total: allPlayers.length,
      returned: players.length,
    });
  } catch (error) {
    console.error("Error in players API:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}

// GET /api/players/[id] - Get a specific player by ID
// This would require a separate route file, but we can handle it here with a param
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerNames } = body;

    if (!playerNames || !Array.isArray(playerNames)) {
      return NextResponse.json(
        { error: "playerNames array is required" },
        { status: 400 }
      );
    }

    const playerPromises = playerNames.map((name: string) => searchPlayer(name));
    const results = await Promise.all(playerPromises);
    const players = results.filter((p): p is ExternalPlayer => p !== null);

    return NextResponse.json({
      players,
      total: players.length,
      requested: playerNames.length,
    });
  } catch (error) {
    console.error("Error in players POST API:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// TheSportsDB free API - no key required for basic usage
const THESPORTSDB_BASE_URL = "https://www.thesportsdb.com/api/v1/json/3";

// Cache duration: 24 hours
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

// Path to the cache file
// In production (Vercel), we use /tmp since the bundled files are read-only
// The repo JSON serves as seed data
const REPO_CACHE_PATH = path.join(process.cwd(), "src/data/players-cache.json");
const TMP_CACHE_PATH = "/tmp/players-cache.json";

export interface ExternalPlayer {
  id: string;
  name: string;
  photo: string | null;
  nationality: string;
  position: string;
  team: string;
  teamId: string;
  teamBadge: string | null;
  nationalityFlag: string | null;
  dateOfBirth: string | null;
}

interface CacheData {
  lastUpdated: number;
  players: ExternalPlayer[];
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

// Top teams to fetch players from (team IDs from TheSportsDB)
// These are stable IDs that won't change - the players within them update automatically
const TOP_TEAM_IDS = [
  "133613", // Manchester City
  "133738", // Real Madrid
  "133739", // Barcelona  
  "133632", // Bayern Munich
  "133602", // Liverpool
  "133604", // Arsenal
  "133610", // Chelsea
  "133612", // Manchester United
  "133714", // Paris Saint-Germain
  "133676", // Juventus
  "133670", // Inter Milan
  "133671", // AC Milan
  "133636", // Borussia Dortmund
  "133703", // Atletico Madrid
  "133616", // Tottenham
];

// In-memory cache for the current process
let memoryCache: CacheData | null = null;

// ============================================
// FILE CACHE OPERATIONS
// ============================================

async function readCacheFromFile(): Promise<CacheData | null> {
  // Try /tmp first (runtime cache, may have fresher data)
  try {
    const data = await fs.readFile(TMP_CACHE_PATH, "utf-8");
    const cache = JSON.parse(data) as CacheData;
    if (cache.players && cache.players.length > 0) {
      return cache;
    }
  } catch {
    // /tmp file doesn't exist or is invalid
  }

  // Fall back to repo file (seed data)
  try {
    const data = await fs.readFile(REPO_CACHE_PATH, "utf-8");
    const cache = JSON.parse(data) as CacheData;
    if (cache.players && cache.players.length > 0) {
      return cache;
    }
  } catch {
    // No valid cache file
  }

  return null;
}

async function writeCacheToFile(cache: CacheData): Promise<void> {
  const jsonData = JSON.stringify(cache, null, 2);

  // Always write to /tmp (works everywhere)
  try {
    await fs.writeFile(TMP_CACHE_PATH, jsonData, "utf-8");
  } catch (error) {
    console.error("Failed to write to /tmp cache:", error);
  }

  // In development, also update the repo file so it persists across restarts
  if (process.env.NODE_ENV === "development") {
    try {
      await fs.writeFile(REPO_CACHE_PATH, jsonData, "utf-8");
      console.log("Updated repo cache file");
    } catch (error) {
      console.error("Failed to write to repo cache:", error);
    }
  }
}

// ============================================
// THESPORTSDB FETCHING (only called by cache refresh)
// ============================================

async function fetchTeamPlayersFromAPI(teamId: string): Promise<ExternalPlayer[]> {
  try {
    const playersResponse = await fetch(
      `${THESPORTSDB_BASE_URL}/lookup_all_players.php?id=${teamId}`,
      { next: { revalidate: 3600 } }
    );

    if (!playersResponse.ok) {
      return [];
    }

    const playersData = await playersResponse.json();
    if (!playersData.player) {
      return [];
    }

    // Get team info for badge
    let teamName = "Unknown";
    let teamBadge: string | null = null;
    
    try {
      const teamResponse = await fetch(
        `${THESPORTSDB_BASE_URL}/lookupteam.php?id=${teamId}`,
        { next: { revalidate: 3600 } }
      );
      if (teamResponse.ok) {
        const teamData = await teamResponse.json();
        if (teamData.teams && teamData.teams[0]) {
          teamName = teamData.teams[0].strTeam;
          teamBadge = teamData.teams[0].strBadge;
        }
      }
    } catch {
      // Team info is optional
    }

    return playersData.player.map((p: TheSportsDBPlayer): ExternalPlayer => ({
      id: p.idPlayer,
      name: p.strPlayer,
      photo: p.strCutout || p.strThumb || null,
      nationality: p.strNationality || "Unknown",
      position: p.strPosition || "Unknown",
      team: p.strTeam || teamName,
      teamId: teamId,
      teamBadge: teamBadge,
      nationalityFlag: null,
      dateOfBirth: p.dateBorn,
    }));
  } catch (error) {
    console.error(`Error fetching team ${teamId} from API:`, error);
    return [];
  }
}

async function fetchAllPlayersFromAPI(): Promise<ExternalPlayer[]> {
  console.log("Fetching fresh player data from TheSportsDB...");
  
  const teamPromises = TOP_TEAM_IDS.map(teamId => fetchTeamPlayersFromAPI(teamId));
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
  
  const players = Array.from(uniquePlayers.values());
  console.log(`Fetched ${players.length} players from ${TOP_TEAM_IDS.length} teams`);
  
  return players;
}

// ============================================
// CACHE HANDLER - The only place that decides to call TheSportsDB
// ============================================

async function getCachedPlayers(): Promise<ExternalPlayer[]> {
  const now = Date.now();

  // Check memory cache first (fastest)
  if (memoryCache && now - memoryCache.lastUpdated < CACHE_DURATION_MS) {
    console.log("Using memory cache");
    return memoryCache.players;
  }

  // Try to read from file
  const fileCache = await readCacheFromFile();
  
  if (fileCache && fileCache.players.length > 0) {
    // Check if file cache is still fresh
    if (now - fileCache.lastUpdated < CACHE_DURATION_MS) {
      console.log("Using file cache (fresh)");
      memoryCache = fileCache;
      return fileCache.players;
    }
    
    // Cache is stale - need to refresh
    console.log("File cache is stale, refreshing from TheSportsDB...");
  }

  // Cache is stale or doesn't exist - fetch fresh data from TheSportsDB
  const freshPlayers = await fetchAllPlayersFromAPI();
  
  if (freshPlayers.length > 0) {
    const newCache: CacheData = {
      lastUpdated: now,
      players: freshPlayers,
    };
    
    // Update both memory and file cache
    memoryCache = newCache;
    await writeCacheToFile(newCache);
    
    return freshPlayers;
  }

  // Fallback to stale cache if fetch failed
  if (fileCache && fileCache.players.length > 0) {
    console.log("Using stale cache as fallback (API fetch failed)");
    memoryCache = fileCache;
    return fileCache.players;
  }

  return [];
}

// ============================================
// API ROUTE HANDLER - All requests use cache
// ============================================

// GET /api/players - Get players from cache
// Query params:
//   - search: Filter players by name (searches within cache)
//   - teamIds: Comma-separated team IDs to filter by (e.g., "133613,133738,133739")
//   - count: Number of players to return (default: 10)
//   - all: If true, return all cached players
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const teamIdsParam = searchParams.get("teamIds");
  const all = searchParams.get("all") === "true";
  const count = parseInt(searchParams.get("count") || "10", 10);

  try {
    // Always get players from cache (refreshes if >1 day old)
    const allPlayers = await getCachedPlayers();
    
    if (allPlayers.length === 0) {
      return NextResponse.json(
        { error: "No players available", players: [] },
        { status: 503 }
      );
    }

    // Filter by search term (case-insensitive name match)
    if (search) {
      const searchLower = search.toLowerCase();
      const matchingPlayers = allPlayers.filter(p => 
        p.name.toLowerCase().includes(searchLower)
      );
      return NextResponse.json({
        players: matchingPlayers.slice(0, count),
        total: matchingPlayers.length,
      });
    }

    // Filter by team IDs (comma-separated)
    if (teamIdsParam) {
      const teamIds = teamIdsParam.split(",").map(id => id.trim());
      const teamPlayers = allPlayers.filter(p => teamIds.includes(p.teamId));
      const shuffled = [...teamPlayers].sort(() => Math.random() - 0.5);
      return NextResponse.json({ 
        players: shuffled.slice(0, count),
        total: teamPlayers.length,
      });
    }
    
    // Return all players if requested
    if (all) {
      return NextResponse.json({
        players: allPlayers,
        total: allPlayers.length,
        cachedAt: memoryCache?.lastUpdated,
        teamsUsed: TOP_TEAM_IDS,
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

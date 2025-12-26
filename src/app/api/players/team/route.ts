import { NextResponse } from "next/server";

const THESPORTSDB_BASE_URL = "https://www.thesportsdb.com/api/v1/json/3";

export interface TeamPlayer {
  id: string;
  name: string;
  photo: string | null;
  nationality: string;
  position: string;
  team: string;
  teamBadge: string | null;
  number: string | null;
}

interface TheSportsDBPlayer {
  idPlayer: string;
  strPlayer: string;
  strThumb: string | null;
  strCutout: string | null;
  strNationality: string;
  strPosition: string;
  strNumber: string | null;
}

interface TheSportsDBTeam {
  idTeam: string;
  strTeam: string;
  strBadge: string | null;
  strLeague: string;
  strCountry: string;
}

// Popular football teams
const POPULAR_TEAMS = [
  "Manchester City",
  "Real Madrid",
  "Barcelona",
  "Bayern Munich",
  "Liverpool",
  "Arsenal",
  "Manchester United",
  "Chelsea",
  "Paris Saint-Germain",
  "Juventus",
  "Inter Milan",
  "AC Milan",
  "Borussia Dortmund",
  "Atletico Madrid",
  "Tottenham",
];

async function getTeamInfo(teamName: string): Promise<TheSportsDBTeam | null> {
  try {
    const response = await fetch(
      `${THESPORTSDB_BASE_URL}/searchteams.php?t=${encodeURIComponent(teamName)}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.teams || data.teams.length === 0) return null;

    // Find soccer team
    return data.teams.find(
      (t: TheSportsDBTeam & { strSport?: string }) => 
        t.strSport === "Soccer" || !t.strSport
    ) || data.teams[0];
  } catch {
    return null;
  }
}

async function getTeamPlayers(teamId: string, team: TheSportsDBTeam): Promise<TeamPlayer[]> {
  try {
    const response = await fetch(
      `${THESPORTSDB_BASE_URL}/lookup_all_players.php?id=${teamId}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.player) return [];

    return data.player.map((p: TheSportsDBPlayer): TeamPlayer => ({
      id: p.idPlayer,
      name: p.strPlayer,
      photo: p.strCutout || p.strThumb || null,
      nationality: p.strNationality || "Unknown",
      position: p.strPosition || "Unknown",
      team: team.strTeam,
      teamBadge: team.strBadge,
      number: p.strNumber,
    }));
  } catch {
    return [];
  }
}

// GET /api/players/team - Get players from a specific team
// Query params:
//   - name: Team name to search for
//   - random: If true, get a random popular team
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamName = searchParams.get("name");
  const random = searchParams.get("random") === "true";

  try {
    let searchTeam = teamName;

    if (random || !searchTeam) {
      // Pick a random popular team
      searchTeam = POPULAR_TEAMS[Math.floor(Math.random() * POPULAR_TEAMS.length)];
    }

    const team = await getTeamInfo(searchTeam);
    
    if (!team) {
      return NextResponse.json(
        { error: "Team not found", searchedFor: searchTeam },
        { status: 404 }
      );
    }

    const players = await getTeamPlayers(team.idTeam, team);

    return NextResponse.json({
      team: {
        id: team.idTeam,
        name: team.strTeam,
        badge: team.strBadge,
        league: team.strLeague,
        country: team.strCountry,
      },
      players,
      total: players.length,
    });
  } catch (error) {
    console.error("Error in team players API:", error);
    return NextResponse.json(
      { error: "Failed to fetch team players" },
      { status: 500 }
    );
  }
}



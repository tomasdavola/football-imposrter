export interface FootballPlayer {
  name: string;
  team: string;
  nationality: string;
  position: string;
  photo?: string | null;
  hint?: string;
}

// Player sources that can be selected (multi-select)
export interface PlayerSourceSelection {
  currentStars: boolean;
  legends: boolean;
  clubs: string[]; // Selected club IDs (from CLUBS array)
}

// Club info with badge URLs and TheSportsDB team IDs (source of truth)
export interface ClubInfo {
  id: string;        // TheSportsDB team ID - source of truth
  name: string;      // Display name
  shortName: string; // Short display name
  badge: string;     // Badge image URL
}

export const CLUBS: ClubInfo[] = [
  { id: "133613", name: "Manchester City", shortName: "Man City", badge: "https://r2.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png" },
  { id: "133738", name: "Real Madrid", shortName: "Real Madrid", badge: "https://r2.thesportsdb.com/images/media/team/badge/vwvwrw1473502969.png" },
  { id: "133739", name: "Barcelona", shortName: "Barcelona", badge: "https://r2.thesportsdb.com/images/media/team/badge/wq9sir1639406443.png" },
  { id: "133632", name: "Bayern Munich", shortName: "Bayern", badge: "https://r2.thesportsdb.com/images/media/team/badge/01ogkh1716960412.png" },
  { id: "133602", name: "Liverpool", shortName: "Liverpool", badge: "https://r2.thesportsdb.com/images/media/team/badge/kfaher1737969724.png" },
  { id: "133604", name: "Arsenal", shortName: "Arsenal", badge: "https://r2.thesportsdb.com/images/media/team/badge/uyhbfe1612467038.png" },
  { id: "133610", name: "Chelsea", shortName: "Chelsea", badge: "https://r2.thesportsdb.com/images/media/team/badge/yvwvtu1448813215.png" },
  { id: "133612", name: "Manchester United", shortName: "Man Utd", badge: "https://r2.thesportsdb.com/images/media/team/badge/xzqdr11517660252.png" },
  { id: "133714", name: "Paris Saint-Germain", shortName: "PSG", badge: "https://r2.thesportsdb.com/images/media/team/badge/rwqrrq1473504808.png" },
  { id: "133676", name: "Juventus", shortName: "Juventus", badge: "https://r2.thesportsdb.com/images/media/team/badge/uxf0gr1742983727.png" },
  { id: "133670", name: "Inter Milan", shortName: "Inter", badge: "https://r2.thesportsdb.com/images/media/team/badge/ryhu6d1617113103.png" },
  { id: "133671", name: "AC Milan", shortName: "AC Milan", badge: "https://r2.thesportsdb.com/images/media/team/badge/wvspur1448806617.png" },
  { id: "133636", name: "Borussia Dortmund", shortName: "Dortmund", badge: "https://r2.thesportsdb.com/images/media/team/badge/tqo8ge1716960353.png" },
  { id: "133703", name: "Atletico Madrid", shortName: "Atletico", badge: "https://r2.thesportsdb.com/images/media/team/badge/0ulh3q1719984315.png" },
  { id: "133616", name: "Tottenham", shortName: "Spurs", badge: "https://r2.thesportsdb.com/images/media/team/badge/dfyfhl1604094109.png" },
];

// Helper to get default selection (all stars selected)
export function getDefaultSourceSelection(): PlayerSourceSelection {
  return {
    currentStars: true,
    legends: true,
    clubs: [],
  };
}

// ============================================
// PREMADE PLAYER LISTS
// ============================================

export const currentStarsPlayers: FootballPlayer[] = [
  { name: "Lionel Messi", team: "Inter Miami", nationality: "Argentina", position: "Forward", hint: "The GOAT debate" },
  { name: "Cristiano Ronaldo", team: "Al-Nassr", nationality: "Portugal", position: "Forward", hint: "SIUUU" },
  { name: "Kylian Mbappé", team: "Real Madrid", nationality: "France", position: "Forward", hint: "Teenage World Cup winner" },
  { name: "Erling Haaland", team: "Manchester City", nationality: "Norway", position: "Striker", hint: "The Viking" },
  { name: "Vinicius Jr.", team: "Real Madrid", nationality: "Brazil", position: "Winger", hint: "Samba magic" },
  { name: "Jude Bellingham", team: "Real Madrid", nationality: "England", position: "Midfielder", hint: "Birmingham to Madrid" },
  { name: "Kevin De Bruyne", team: "Manchester City", nationality: "Belgium", position: "Midfielder", hint: "Assist king" },
  { name: "Mohamed Salah", team: "Liverpool", nationality: "Egypt", position: "Forward", hint: "Egyptian King" },
  { name: "Robert Lewandowski", team: "Barcelona", nationality: "Poland", position: "Striker", hint: "5 goals in 9 minutes" },
  { name: "Neymar Jr.", team: "Al-Hilal", nationality: "Brazil", position: "Forward", hint: "Rainbow flicks" },
  { name: "Luka Modrić", team: "Real Madrid", nationality: "Croatia", position: "Midfielder", hint: "2018 Ballon d'Or" },
  { name: "Harry Kane", team: "Bayern Munich", nationality: "England", position: "Striker", hint: "Tottenham legend" },
  { name: "Bruno Fernandes", team: "Manchester United", nationality: "Portugal", position: "Midfielder", hint: "Penalty specialist" },
  { name: "Phil Foden", team: "Manchester City", nationality: "England", position: "Midfielder", hint: "Stockport Iniesta" },
  { name: "Bukayo Saka", team: "Arsenal", nationality: "England", position: "Winger", hint: "Starboy" },
  { name: "Jamal Musiala", team: "Bayern Munich", nationality: "Germany", position: "Midfielder", hint: "Bambi" },
  { name: "Pedri", team: "Barcelona", nationality: "Spain", position: "Midfielder", hint: "La Masia gem" },
  { name: "Rodri", team: "Manchester City", nationality: "Spain", position: "Midfielder", hint: "2024 Ballon d'Or" },
  { name: "Florian Wirtz", team: "Bayer Leverkusen", nationality: "Germany", position: "Midfielder", hint: "Wonderkid" },
  { name: "Cole Palmer", team: "Chelsea", nationality: "England", position: "Midfielder", hint: "Cold Palmer" },
  { name: "Virgil van Dijk", team: "Liverpool", nationality: "Netherlands", position: "Defender", hint: "The Colossus" },
  { name: "Thibaut Courtois", team: "Real Madrid", nationality: "Belgium", position: "Goalkeeper", hint: "UCL final hero" },
  { name: "Manuel Neuer", team: "Bayern Munich", nationality: "Germany", position: "Goalkeeper", hint: "Sweeper keeper" },
  { name: "Alisson Becker", team: "Liverpool", nationality: "Brazil", position: "Goalkeeper", hint: "Brazilian wall" },
  { name: "Martin Ødegaard", team: "Arsenal", nationality: "Norway", position: "Midfielder", hint: "Young captain" },
  { name: "Declan Rice", team: "Arsenal", nationality: "England", position: "Midfielder", hint: "West Ham legend" },
  { name: "Son Heung-min", team: "Tottenham", nationality: "South Korea", position: "Forward", hint: "Sonny" },
  { name: "Lamine Yamal", team: "Barcelona", nationality: "Spain", position: "Winger", hint: "Euro 2024 star at 16" },
  { name: "Gavi", team: "Barcelona", nationality: "Spain", position: "Midfielder", hint: "Golden Boy 2022" },
  { name: "Federico Valverde", team: "Real Madrid", nationality: "Uruguay", position: "Midfielder", hint: "The engine" },
];

export const legendsPlayers: FootballPlayer[] = [
  { name: "Diego Maradona", team: "Napoli (Legend)", nationality: "Argentina", position: "Forward", hint: "Hand of God" },
  { name: "Pelé", team: "Santos (Legend)", nationality: "Brazil", position: "Forward", hint: "O Rei - 3 World Cups" },
  { name: "Zinedine Zidane", team: "Real Madrid (Legend)", nationality: "France", position: "Midfielder", hint: "The Headbutt" },
  { name: "Ronaldinho", team: "Barcelona (Legend)", nationality: "Brazil", position: "Forward", hint: "Smile and elastico" },
  { name: "Thierry Henry", team: "Arsenal (Legend)", nationality: "France", position: "Forward", hint: "Va Va Voom" },
  { name: "Ronaldo Nazário", team: "Real Madrid (Legend)", nationality: "Brazil", position: "Striker", hint: "Il Fenomeno" },
  { name: "Andrea Pirlo", team: "Juventus (Legend)", nationality: "Italy", position: "Midfielder", hint: "The Architect" },
  { name: "David Beckham", team: "Manchester United (Legend)", nationality: "England", position: "Midfielder", hint: "Bend it like..." },
  { name: "Wayne Rooney", team: "Manchester United (Legend)", nationality: "England", position: "Forward", hint: "Remember the name" },
  { name: "Steven Gerrard", team: "Liverpool (Legend)", nationality: "England", position: "Midfielder", hint: "Istanbul 2005" },
  { name: "Frank Lampard", team: "Chelsea (Legend)", nationality: "England", position: "Midfielder", hint: "Super Frank" },
  { name: "Xavi Hernández", team: "Barcelona (Legend)", nationality: "Spain", position: "Midfielder", hint: "Tiki-taka master" },
  { name: "Andrés Iniesta", team: "Barcelona (Legend)", nationality: "Spain", position: "Midfielder", hint: "2010 World Cup winner" },
  { name: "Paolo Maldini", team: "AC Milan (Legend)", nationality: "Italy", position: "Defender", hint: "25 years, one club" },
  { name: "Roberto Carlos", team: "Real Madrid (Legend)", nationality: "Brazil", position: "Left Back", hint: "Impossible free kick" },
  { name: "Kaká", team: "AC Milan (Legend)", nationality: "Brazil", position: "Midfielder", hint: "2007 Ballon d'Or" },
  { name: "Alessandro Del Piero", team: "Juventus (Legend)", nationality: "Italy", position: "Forward", hint: "Il Capitano" },
  { name: "Gianluigi Buffon", team: "Juventus (Legend)", nationality: "Italy", position: "Goalkeeper", hint: "Most expensive keeper of his era" },
  { name: "Zlatan Ibrahimović", team: "AC Milan (Legend)", nationality: "Sweden", position: "Striker", hint: "God of confidence" },
  { name: "Samuel Eto'o", team: "Barcelona (Legend)", nationality: "Cameroon", position: "Striker", hint: "African great" },
  { name: "Patrick Vieira", team: "Arsenal (Legend)", nationality: "France", position: "Midfielder", hint: "Invincible captain" },
  { name: "Dennis Bergkamp", team: "Arsenal (Legend)", nationality: "Netherlands", position: "Forward", hint: "The Iceman" },
  { name: "Johan Cruyff", team: "Barcelona (Legend)", nationality: "Netherlands", position: "Forward", hint: "Total Football" },
  { name: "George Best", team: "Manchester United (Legend)", nationality: "Northern Ireland", position: "Winger", hint: "5th Beatle" },
  { name: "Eric Cantona", team: "Manchester United (Legend)", nationality: "France", position: "Forward", hint: "The King" },
  { name: "Didier Drogba", team: "Chelsea (Legend)", nationality: "Ivory Coast", position: "Striker", hint: "Big game player" },
  { name: "Sergio Ramos", team: "Real Madrid (Legend)", nationality: "Spain", position: "Defender", hint: "Last minute headers" },
  { name: "Iker Casillas", team: "Real Madrid (Legend)", nationality: "Spain", position: "Goalkeeper", hint: "San Iker" },
  { name: "Carles Puyol", team: "Barcelona (Legend)", nationality: "Spain", position: "Defender", hint: "The Captain" },
  { name: "Francesco Totti", team: "AS Roma (Legend)", nationality: "Italy", position: "Forward", hint: "Il Capitano of Rome" },
];

// Combined list
export const allPremadePlayers: FootballPlayer[] = [...currentStarsPlayers, ...legendsPlayers];

// ============================================
// LOCAL FUNCTIONS (for premade lists)
// ============================================

export function getRandomPlayerFromList(list: FootballPlayer[]): FootballPlayer {
  return list[Math.floor(Math.random() * list.length)];
}

export function getRandomPlayersFromList(list: FootballPlayer[], count: number): FootballPlayer[] {
  const shuffled = [...list].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, list.length));
}

// ============================================
// API FUNCTIONS (for club data)
// ============================================

interface ApiPlayerResponse {
  player?: FootballPlayer;
  players?: FootballPlayer[];
  team?: {
    name: string;
    badge: string;
  };
  error?: string;
}

/**
 * Fetches random player(s) from the API (top clubs)
 */
export async function getPlayersFromAPI(count: number = 1): Promise<FootballPlayer[]> {
  try {
    const response = await fetch(`/api/players?count=${count}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data: ApiPlayerResponse = await response.json();
    
    if (data.players && data.players.length > 0) {
      return data.players;
    }
    
    throw new Error("No players returned from API");
  } catch (error) {
    console.error("Failed to fetch from API:", error);
    // Fallback to premade list
    return getRandomPlayersFromList(allPremadePlayers, count);
  }
}

/**
 * Fetches players from multiple clubs by team IDs (single API call)
 */
export async function getPlayersFromClubs(teamIds: string[], count: number = 100): Promise<FootballPlayer[]> {
  if (teamIds.length === 0) {
    return [];
  }
  
  try {
    const response = await fetch(`/api/players?teamIds=${teamIds.join(",")}&count=${count}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data: ApiPlayerResponse = await response.json();
    
    if (data.players && data.players.length > 0) {
      return data.players;
    }
    
    throw new Error("No players returned from API");
  } catch (error) {
    console.error(`Failed to fetch from teams ${teamIds.join(",")}:`, error);
    return getRandomPlayersFromList(allPremadePlayers, count);
  }
}

// ============================================
// MAIN FUNCTION - Gets players based on source selection
// ============================================

export async function getPlayersFromSelection(
  selection: PlayerSourceSelection,
  count: number = 1
): Promise<FootballPlayer[]> {
  const allPlayers: FootballPlayer[] = [];
  
  // Add current stars if selected
  if (selection.currentStars) {
    allPlayers.push(...currentStarsPlayers);
  }
  
  // Add legends if selected
  if (selection.legends) {
    allPlayers.push(...legendsPlayers);
  }
  
  // Fetch from selected clubs (single API call with all team IDs)
  if (selection.clubs.length > 0) {
    try {
      const clubPlayers = await getPlayersFromClubs(selection.clubs, 500);
      allPlayers.push(...clubPlayers);
    } catch (error) {
      console.error("Failed to fetch from clubs:", error);
    }
  }
  
  // If nothing selected, default to all premade
  if (allPlayers.length === 0) {
    return getRandomPlayersFromList(allPremadePlayers, count);
  }
  
  // Shuffle and return requested count
  const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// Convenience function for getting a single player
export async function getRandomPlayer(
  selection?: PlayerSourceSelection
): Promise<FootballPlayer> {
  const sel = selection || getDefaultSourceSelection();
  const players = await getPlayersFromSelection(sel, 1);
  return players[0];
}

// Convenience function for getting multiple players
export async function getRandomPlayers(
  count: number,
  selection?: PlayerSourceSelection
): Promise<FootballPlayer[]> {
  const sel = selection || getDefaultSourceSelection();
  return getPlayersFromSelection(sel, count);
}

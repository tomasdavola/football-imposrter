import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// POST /api/analytics - Track game events
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, data } = body;

    switch (event) {
      case "session_start": {
        const { sessionId, userAgent } = data;
        await sql`
          INSERT INTO game_sessions (session_id, user_agent)
          VALUES (${sessionId}, ${userAgent})
          ON CONFLICT (session_id) DO NOTHING
        `;
        return NextResponse.json({ success: true });
      }

      case "session_end": {
        const { sessionId } = data;
        await sql`
          UPDATE game_sessions 
          SET ended_at = NOW()
          WHERE session_id = ${sessionId}
        `;
        return NextResponse.json({ success: true });
      }

      case "game_start": {
        const { 
          sessionId, 
          gameNumber, 
          playerCount, 
          imposterCount, 
          discussionTime,
          trollEvent,
          sourceSelection 
        } = data;
        
        await sql`
          INSERT INTO games (
            session_id, 
            game_number, 
            player_count, 
            imposter_count, 
            discussion_time,
            started_at,
            troll_event,
            source_selection
          )
          VALUES (
            ${sessionId}, 
            ${gameNumber}, 
            ${playerCount}, 
            ${imposterCount}, 
            ${discussionTime},
            NOW(),
            ${trollEvent},
            ${JSON.stringify(sourceSelection)}
          )
        `;
        
        // Update session game count
        await sql`
          UPDATE game_sessions 
          SET total_games = total_games + 1
          WHERE session_id = ${sessionId}
        `;
        
        return NextResponse.json({ success: true });
      }

      case "game_end": {
        const { sessionId, gameNumber } = data;
        
        // Calculate duration and update
        await sql`
          UPDATE games 
          SET 
            ended_at = NOW(),
            duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
          WHERE session_id = ${sessionId} AND game_number = ${gameNumber}
        `;
        
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Unknown event type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Analytics error:", error);
    // Don't fail the request - analytics should be non-blocking
    return NextResponse.json({ success: false, error: "Failed to track" });
  }
}

// GET /api/analytics - Get analytics summary (for admin/debugging)
export async function GET() {
  try {
    const [stats] = await sql`
      SELECT 
        (SELECT COUNT(*) FROM game_sessions) as total_sessions,
        (SELECT COUNT(*) FROM games) as total_games,
        (SELECT AVG(duration_seconds) FROM games WHERE duration_seconds IS NOT NULL) as avg_game_duration,
        (SELECT AVG(player_count) FROM games) as avg_players,
        (SELECT COUNT(*) FROM games WHERE troll_event IS NOT NULL) as troll_games
    `;
    
    const recentGames = await sql`
      SELECT 
        g.player_count,
        g.imposter_count,
        g.duration_seconds,
        g.troll_event,
        g.started_at
      FROM games g
      ORDER BY g.started_at DESC
      LIMIT 10
    `;
    
    return NextResponse.json({
      stats,
      recentGames,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}


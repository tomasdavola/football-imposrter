"use client";

// Generate a unique session ID
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Get or create session ID from sessionStorage
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  
  let sessionId = sessionStorage.getItem("football-imposter-session");
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem("football-imposter-session", sessionId);
  }
  return sessionId;
}

// Track an analytics event (fire-and-forget, non-blocking)
async function track(event: string, data: Record<string, unknown>): Promise<void> {
  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data }),
    });
  } catch {
    // Silently fail - analytics should never break the app
  }
}

// Analytics functions
export const analytics = {
  // Call when session starts (page load)
  sessionStart: () => {
    const sessionId = getSessionId();
    track("session_start", {
      sessionId,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  },

  // Call when session ends (page unload)
  sessionEnd: () => {
    const sessionId = getSessionId();
    // Use sendBeacon for reliable delivery on page unload
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics",
        JSON.stringify({
          event: "session_end",
          data: { sessionId },
        })
      );
    }
  },

  // Call when a game starts
  gameStart: (data: {
    gameNumber: number;
    playerCount: number;
    imposterCount: number;
    discussionTime: number | null;
    trollEvent: string | null;
    sourceSelection: {
      currentStars: boolean;
      legends: boolean;
      clubs: string[];
    };
  }) => {
    const sessionId = getSessionId();
    track("game_start", {
      sessionId,
      ...data,
    });
  },

  // Call when a game ends
  gameEnd: (gameNumber: number) => {
    const sessionId = getSessionId();
    track("game_end", {
      sessionId,
      gameNumber,
    });
  },

  // Get current game number from session
  getGameNumber: (): number => {
    if (typeof window === "undefined") return 1;
    const count = sessionStorage.getItem("football-imposter-game-count");
    return count ? parseInt(count, 10) : 1;
  },

  // Increment game number
  incrementGameNumber: (): number => {
    if (typeof window === "undefined") return 1;
    const current = analytics.getGameNumber();
    const next = current + 1;
    sessionStorage.setItem("football-imposter-game-count", next.toString());
    return next;
  },
};


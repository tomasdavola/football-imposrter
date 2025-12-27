import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// In-memory fallback for development (when Upstash isn't configured)
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const RATE_LIMIT_REQUESTS = 30; // requests
const RATE_LIMIT_WINDOW = 60; // seconds

// Create Upstash rate limiter if configured
let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMIT_REQUESTS, `${RATE_LIMIT_WINDOW} s`),
    analytics: true,
    prefix: "football-imposter",
  });
}

// In-memory rate limiter fallback
function inMemoryRateLimit(ip: string): { success: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = RATE_LIMIT_WINDOW * 1000;
  
  const record = inMemoryStore.get(ip);
  
  if (!record || now > record.resetTime) {
    inMemoryStore.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: RATE_LIMIT_REQUESTS - 1 };
  }
  
  if (record.count >= RATE_LIMIT_REQUESTS) {
    return { success: false, remaining: 0 };
  }
  
  record.count++;
  return { success: true, remaining: RATE_LIMIT_REQUESTS - record.count };
}

// Clean up old entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of inMemoryStore.entries()) {
    if (now > record.resetTime) {
      inMemoryStore.delete(ip);
    }
  }
}, 60000); // Clean every minute

export async function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Get client IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? 
             request.headers.get("x-real-ip") ?? 
             "127.0.0.1";

  let success: boolean;
  let remaining: number;

  if (ratelimit) {
    // Use Upstash rate limiter (production)
    const result = await ratelimit.limit(ip);
    success = result.success;
    remaining = result.remaining;
  } else {
    // Use in-memory fallback (development)
    const result = inMemoryRateLimit(ip);
    success = result.success;
    remaining = result.remaining;
  }

  // Add rate limit headers
  const response = success 
    ? NextResponse.next()
    : NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );

  response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_REQUESTS));
  response.headers.set("X-RateLimit-Remaining", String(remaining));

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
  ],
};


import { Redis } from "@upstash/redis";

// Initialize Redis client
// Uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Room expires after 2 hours of inactivity
export const ROOM_TTL = 2 * 60 * 60; // 2 hours in seconds


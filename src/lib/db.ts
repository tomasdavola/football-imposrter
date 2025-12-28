import { neon } from "@neondatabase/serverless";

// Select database URL based on environment
const getDatabaseUrl = (): string => {
  const env = process.env.ENVIRONMENT;
  
  if (env === "PROD") {
    return process.env.PRODUCTION_DATABASE_URL!;
  }
  
  if (env === "DEV") {
    return process.env.DEV_DATABASE_URL!;
  }
  
  // Fallback to generic DATABASE_URL if ENVIRONMENT is not set
  return process.env.DATABASE_URL!;
};

// Create a SQL query function using the Neon serverless driver
export const sql = neon(getDatabaseUrl());


import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Ensure environment variables are loaded
config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is required. Current env keys: ' +
      Object.keys(process.env).join(', ')
  );
}

// SSL is enabled by default (required by OmniFlow-managed Postgres).
// Set DATABASE_SSL=false for local Postgres without TLS.
const useSSL = process.env.DATABASE_SSL !== 'false';

// Database connection with connection pooling
const client = postgres(process.env.DATABASE_URL, {
  ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {}),
  max: 10, // Set pool size
  idle_timeout: 20, // Idle connection timeout in seconds
  connect_timeout: 10, // Connection timeout in seconds
});

export const db = drizzle(client);

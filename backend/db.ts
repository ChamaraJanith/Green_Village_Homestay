import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizePostgresConnectionString(connectionString: string): string {
  const url = new URL(connectionString);

  if (url.searchParams.get('sslmode') === 'require') {
    url.searchParams.set('sslmode', 'no-verify');
  }

  return url.toString();
}

const rawPostgresConnectionString =
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL_NON_POOLING;

if (!rawPostgresConnectionString) {
  throw new Error('Missing required PostgreSQL connection string. Set POSTGRES_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL_NON_POOLING.');
}

const postgresConnectionString = normalizePostgresConnectionString(rawPostgresConnectionString);

const supabaseUrl = requireEnv('SUPABASE_URL');
const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

export const pool = new Pool({
  connectionString: postgresConnectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

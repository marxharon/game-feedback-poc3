import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/levelup_db',
});

export const db = drizzle(pool);

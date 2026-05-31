import { Client } from 'pg';

async function createDb() {
  const client = new Client({
    user: 'postgres',
    password: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'postgres'
  });
  
  try {
    await client.connect();
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'levelup_db'");
    if (res.rowCount === 0) {
      await client.query("CREATE DATABASE levelup_db");
      console.log("Database 'levelup_db' created successfully.");
    } else {
      console.log("Database 'levelup_db' already exists.");
    }
  } catch (err) {
    console.error("Error creating database:", err);
  } finally {
    await client.end();
  }
}

createDb();

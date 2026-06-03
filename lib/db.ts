import { Pool, PoolClient, QueryResultRow } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

declare global {
  // eslint-disable-next-line no-var
  var __splitwisePool: Pool | undefined;
}

const pool = globalThis.__splitwisePool ?? new Pool({ connectionString: databaseUrl });

if (process.env.NODE_ENV !== "production") {
  globalThis.__splitwisePool = pool;
}

export async function query<T extends QueryResultRow>(text: string, values?: unknown[]) {
  return pool.query<T>(text, values);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

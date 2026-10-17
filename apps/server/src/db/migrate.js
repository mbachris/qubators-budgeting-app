import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(here, "..", "..", "sql", "001_init.sql");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const sql = await readFile(sqlPath, "utf8");
await client.query(sql);
console.log("[db] schema + seeds applied");
await client.end();

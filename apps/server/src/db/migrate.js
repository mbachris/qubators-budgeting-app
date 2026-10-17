import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "..", "sql");

const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
for (const f of files) {
  const sql = await readFile(join(dir, f), "utf8");
  await client.query(sql);
  console.log(`[db] applied ${f}`);
}
console.log("[db] schema + seeds applied");
await client.end();

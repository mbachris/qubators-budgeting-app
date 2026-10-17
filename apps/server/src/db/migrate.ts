import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client";

await migrate(db, { migrationsFolder: "./drizzle" });
console.log("[db] migrations applied");
await pool.end();

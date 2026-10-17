import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth.js";
import { sync } from "./routes/sync.js";
import { uploads } from "./routes/uploads.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
  })
);

app.get("/health", (c) => c.json({ ok: true, service: "qubators-server" }));

// Better Auth (email OTP)
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Sync + R2 presign
app.route("/sync", sync);
app.route("/uploads", uploads);

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`qubators-server on http://localhost:${port}`);
  console.log("phone on same WiFi uses EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:3000");
});

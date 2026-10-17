import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { sync } from "./routes/sync";
import { uploads } from "./routes/uploads";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/health", (c) => c.json({ ok: true, service: "qubators-server" }));

// Better Auth handler (email OTP sign-in)
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Sync + blob presign
app.route("/sync", sync);
app.route("/uploads", uploads);

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`qubators-server on http://localhost:${port}`);
  console.log(`LAN: http://192.168.x.x:${port}  (phone uses EXPO_PUBLIC_API_URL)`);
});

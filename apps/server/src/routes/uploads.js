import { Hono } from "hono";
import { AwsClient } from "aws4fetch";
import { auth } from "../auth.js";

export const uploads = new Hono();

const accountId = process.env.R2_ACCOUNT_ID;
const bucket = process.env.R2_BUCKET ?? "qubators-backups";

const r2 = new AwsClient({
  accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  service: "s3",
  region: "auto",
});

// Presign a direct PUT to R2 for the signed-in user. Ledger truth never lives in R2.
uploads.post("/presign", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "unauthorized" }, 401);
  if (!accountId || !process.env.R2_ACCESS_KEY_ID) {
    return c.json({ error: "r2_not_configured" }, 501);
  }

  const { filename, contentType } = await c.req.json();
  if (!filename) return c.json({ error: "filename_required" }, 400);

  const key = `${session.user.id}/${Date.now()}-${String(filename).replace(/[^\w.\-]/g, "_")}`;
  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`);
  url.searchParams.set("X-Amz-Expires", "900");

  const signed = await r2.sign(
    new Request(url.toString(), {
      method: "PUT",
      headers: contentType ? { "content-type": contentType } : undefined,
    }),
    { aws: { signQuery: true } }
  );

  return c.json({ url: signed.url, key, expiresIn: 900 });
});

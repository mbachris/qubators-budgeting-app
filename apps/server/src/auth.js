import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, bearer } from "better-auth/plugins";
import { db, schema } from "./db/client.js";

// Local-dev mail fallback: OTP is printed to this server console.
async function sendOTP({ email, otp, type }) {
  console.log(`[auth] ${type ?? "sign-in"} OTP for ${email}: ${otp}`);
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me-0000000000000000",
  baseURL: process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: { enabled: false },
  plugins: [
    bearer(),
    emailOTP({
      expiresIn: 300,
      async sendVerificationOTP({ email, otp, type }) {
        await sendOTP({ email, otp, type });
      },
    }),
  ],
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? "http://localhost:8081").split(","),
});

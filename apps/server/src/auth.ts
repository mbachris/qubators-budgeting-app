import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { db, schema } from "./db/client";

// Local-dev mail fallback: print OTP to server console. Swap for SMTP/R2-backed sender later.
async function sendOTP({ email, otp }: { email: string; otp: string }) {
  console.log(`[auth] OTP for ${email}: ${otp}`);
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
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
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        await sendOTP({ email, otp });
      },
      expiresIn: 300,
    }),
  ],
  trustedOrigins: ["http://localhost:8081", "http://192.168.1.171:8081"],
});

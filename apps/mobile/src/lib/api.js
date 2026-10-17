import * as SecureStore from "expo-secure-store";

// LAN only. No Vercel. Set EXPO_PUBLIC_API_URL when starting Metro:
//   set EXPO_PUBLIC_API_URL=http://192.168.1.171:3000 && npx expo start --lan
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.171:3000").trim().replace(/\/+$/, "");

const TOKEN_KEY = "qubators.session.token";

export async function getToken() {
  try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
}
export async function setToken(t) {
  try {
    if (t) await SecureStore.setItemAsync(TOKEN_KEY, t);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {}
}

async function req(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = await getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, headers: res.headers, data: json };
}

export const health = () => req("/health");
export const pullProjects = () => req("/sync/projects");
export const pushRows = (rows, deviceId) => req("/sync/push", { method: "POST", body: { deviceId, rows }, auth: true });
export const pull = (since = 0) => req(`/sync/pull?since=${since}`, { auth: true });

export async function sendOtp(email) {
  return req("/api/auth/email-otp/send-verification-otp", {
    method: "POST",
    body: { email, type: "sign-in" },
  });
}

export async function signInWithOtp(email, otp, name) {
  const r = await req("/api/auth/sign-in/email-otp", {
    method: "POST",
    body: { email, otp, name },
  });
  const token = r.headers.get("set-auth-token");
  if (token) await setToken(token);
  return r;
}

export async function getSession() {
  return req("/api/auth/get-session", { auth: true });
}

export async function logout() {
  await req("/api/auth/sign-out", { method: "POST", auth: true });
  await setToken(null);
}

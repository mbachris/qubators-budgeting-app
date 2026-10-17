import * as SecureStore from "expo-secure-store";

// LAN only. No Vercel. Set EXPO_PUBLIC_API_URL when starting Metro, or change it
// in Settings → Server URL (stored on device) without rebuilding.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.171:3000").trim().replace(/\/+$/, "");

const TOKEN_KEY = "qubators.session.token";
const URL_KEY = "qubators.api.url";

export async function getToken() {
  try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
}
export async function setToken(t) {
  try {
    if (t) await SecureStore.setItemAsync(TOKEN_KEY, t);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {}
}

export async function getBaseUrl() {
  try {
    const saved = await SecureStore.getItemAsync(URL_KEY);
    if (saved) return saved.trim().replace(/\/+$/, "");
  } catch {}
  return API_URL;
}

export async function setBaseUrl(url) {
  const clean = String(url ?? "").trim().replace(/\/+$/, "");
  try {
    if (clean) await SecureStore.setItemAsync(URL_KEY, clean);
    else await SecureStore.deleteItemAsync(URL_KEY);
  } catch {}
  return clean || API_URL;
}

async function req(path, { method = "GET", body, auth = false, base = null } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = await getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const root = base ?? (await getBaseUrl());
  const res = await fetch(`${root}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, headers: res.headers, data: json };
}

export const health = (base = null) => req("/health", { base });
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

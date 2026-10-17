export function uuid() {
  // RFC4122 v4 without deps (Expo/RN getRandomValues not guaranteed on all builds)
  const r = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${r()}${r()}-${r()}-4${r().slice(1)}-a${r().slice(1)}-${r()}${r()}${r()}`;
}
export const now = () => Date.now();

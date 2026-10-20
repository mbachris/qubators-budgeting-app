// Small device preferences (intro seen, theme mode). SecureStore is already a
// dependency and survives app restarts; values are short strings.
import * as SecureStore from "expo-secure-store";

export async function getPref(key, fallback = null) {
  try {
    const v = await SecureStore.getItemAsync(key);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setPref(key, value) {
  try {
    await SecureStore.setItemAsync(key, String(value));
    return true;
  } catch {
    return false;
  }
}

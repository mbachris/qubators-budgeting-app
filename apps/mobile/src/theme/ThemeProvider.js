// Light/dark switching. Screens build their styles from the active palette, so a
// toggle repaints everything without a reload; the choice is remembered on device.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { light, dark } from "./tokens";
import { getPref, setPref } from "../lib/prefs";

const ThemeContext = createContext(null);

const FALLBACK = { mode: "light", c: light, ready: true, setMode: () => {}, toggle: () => {} };

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getPref("theme").then((v) => {
      if (!alive) return;
      if (v === "dark" || v === "light") setModeState(v);
      setReady(true);
    });
    return () => { alive = false; };
  }, []);

  const setMode = useCallback(async (next) => {
    const m = next === "dark" ? "dark" : "light";
    setModeState(m);
    await setPref("theme", m);
  }, []);

  const value = useMemo(() => ({
    mode,
    c: mode === "dark" ? dark : light,
    ready,
    setMode,
    toggle: () => setMode(mode === "dark" ? "light" : "dark"),
  }), [mode, ready, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext) ?? FALLBACK;
}

export function useColors() {
  return useTheme().c;
}

// Styles are plain objects built from the palette; memoised per mode.
export function useThemedStyles(factory) {
  const { mode, c } = useTheme();
  return useMemo(() => factory(c), [mode, factory]);
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, View, Text, Pressable } from "react-native";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { randomTip } from "../content/tips";

const THEME = {
  budgeting: { label: "Budgeting", tone: "info" },
  spending: { label: "Spending wisely", tone: "accent" },
  saving: { label: "Saving", tone: "savings" },
  wealth: { label: "Wealth creation", tone: "primary" },
  giving: { label: "Giving", tone: "tithe" },
  peace: { label: "Peace of mind", tone: "text" },
};

// A sticky saying on open, then again every few minutes while the app is used.
export default function TipModal({ intervalMs = 3 * 60 * 1000, delayMs = 1200 }) {
  const { c } = useTheme();
  const s = useThemedStyles(makeStyles);
  const [tip, setTip] = useState(null);
  const lastId = useRef(null);
  const anim = useRef(new Animated.Value(0)).current;

  const show = useCallback(() => {
    const next = randomTip(lastId.current);
    lastId.current = next.id;
    setTip(next);
  }, []);

  useEffect(() => {
    const openTimer = setTimeout(show, delayMs);
    const loop = setInterval(show, intervalMs);
    return () => { clearTimeout(openTimer); clearInterval(loop); };
  }, [show, intervalMs, delayMs]);

  useEffect(() => {
    if (!tip) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [tip, anim]);

  const theme = useMemo(() => {
    const t = THEME[tip?.theme] ?? THEME.peace;
    return { label: t.label, color: c[t.tone] ?? c.text };
  }, [tip, c]);

  if (!tip) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => setTip(null)}>
      <View style={s.backdrop}>
        <Animated.View
          style={[
            s.card,
            {
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
            },
          ]}
        >
          <View style={[s.accent, { backgroundColor: theme.color }]} />

          <View style={s.head}>
            <Text style={s.brand}>QUBATORS</Text>
            <View style={[s.chip, { backgroundColor: c.surface2, borderColor: theme.color }]}>
              <Text style={[s.chipT, { color: theme.color }]}>{theme.label}</Text>
            </View>
          </View>

          <Text style={[s.quote, { color: theme.color }]}>“</Text>
          <Text style={s.text}>{tip.text}</Text>

          <View style={s.rule} />

          <View style={s.row}>
            <Pressable style={s.ghost} onPress={show}>
              <Text style={s.ghostT}>Another one</Text>
            </Pressable>
            <Pressable style={[s.btn, { backgroundColor: c.primary }]} onPress={() => setTip(null)}>
              <Text style={s.bt}>Got it</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = (c) => ({
  backdrop: { flex: 1, backgroundColor: "rgba(2,6,23,0.72)", alignItems: "center", justifyContent: "center", padding: 22 },
  card: { width: "100%", backgroundColor: c.surface, borderRadius: 22, paddingTop: 22, paddingHorizontal: 20, paddingBottom: 16, overflow: "hidden" },
  accent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 6 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 11, fontWeight: "800", letterSpacing: 2, color: c.text3 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipT: { fontSize: 11, fontWeight: "800" },
  quote: { fontSize: 46, fontWeight: "800", lineHeight: 46, marginTop: 10 },
  text: { fontSize: 20, lineHeight: 29, fontWeight: "600", color: c.text, marginTop: 2 },
  rule: { height: 1, backgroundColor: c.border, marginTop: 18 },
  row: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 12 },
  ghost: { backgroundColor: c.surface2, borderRadius: 12, paddingHorizontal: 16, height: 44, alignItems: "center", justifyContent: "center", marginRight: 8 },
  ghostT: { color: c.text, fontWeight: "700" },
  btn: { borderRadius: 12, paddingHorizontal: 20, height: 44, alignItems: "center", justifyContent: "center" },
  bt: { color: "#fff", fontWeight: "800" },
});

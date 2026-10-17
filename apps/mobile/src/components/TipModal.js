import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { light } from "../theme/tokens";
import { randomTip } from "../content/tips";

const THEME = {
  budgeting: { label: "Budgeting", color: "#2563EB", bg: "#EFF6FF" },
  spending: { label: "Spending wisely", color: "#F59E0B", bg: "#FFFBEB" },
  saving: { label: "Saving", color: "#0EA5E9", bg: "#F0F9FF" },
  wealth: { label: "Wealth creation", color: "#16A34A", bg: "#F0FDF4" },
  giving: { label: "Giving", color: "#8B5CF6", bg: "#F5F3FF" },
  peace: { label: "Peace of mind", color: "#0F172A", bg: "#F1F5F9" },
};

// A sticky saying on open, then again every few minutes while the app is used.
export default function TipModal({ intervalMs = 3 * 60 * 1000, delayMs = 1200 }) {
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

  const theme = useMemo(() => THEME[tip?.theme] ?? THEME.peace, [tip]);

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
            <View style={[s.chip, { backgroundColor: theme.bg, borderColor: theme.color }]}>
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
            <Pressable style={[s.btn, { backgroundColor: theme.color }]} onPress={() => setTip(null)}>
              <Text style={s.bt}>Got it</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.55)", alignItems: "center", justifyContent: "center", padding: 22 },
  card: { width: "100%", backgroundColor: light.surface, borderRadius: 22, paddingTop: 22, paddingHorizontal: 20, paddingBottom: 16, overflow: "hidden" },
  accent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 6 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 11, fontWeight: "800", letterSpacing: 2, color: light.text3 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipT: { fontSize: 11, fontWeight: "800" },
  quote: { fontSize: 46, fontWeight: "800", lineHeight: 46, marginTop: 10 },
  text: { fontSize: 20, lineHeight: 29, fontWeight: "600", color: light.text, marginTop: 2 },
  rule: { height: 1, backgroundColor: light.border, marginTop: 18 },
  row: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 12 },
  ghost: { backgroundColor: light.surface2, borderRadius: 12, paddingHorizontal: 16, height: 44, alignItems: "center", justifyContent: "center", marginRight: 8 },
  ghostT: { color: light.text, fontWeight: "700" },
  btn: { borderRadius: 12, paddingHorizontal: 20, height: 44, alignItems: "center", justifyContent: "center" },
  bt: { color: "#fff", fontWeight: "800" },
});

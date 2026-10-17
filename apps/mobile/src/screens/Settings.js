import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { light } from "../theme/tokens";
import { exportAll } from "../db/repo";

export default function Settings({ online, setOnline, pending }) {
  const [msg, setMsg] = useState("");
  return (
    <View>
      <Text style={s.h}>Settings</Text>
      <View style={s.card}>
        <Text style={s.t}>Local Vault — Always on</Text>
        <Text style={s.m}>On-device SQLite. Budgeting works offline, always.</Text>
      </View>
      <Pressable onPress={() => setOnline(!online)} style={s.card}>
        <Text style={s.t}>Cloud Sync — {online ? "On (local stub)" : "Off (tap to simulate)"}</Text>
        <Text style={s.m}>Pending queue: {pending} item{pending === 1 ? "" : "s"}. Better Auth + Postgres + R2 when the local server runs.</Text>
      </Pressable>
      <Pressable
        style={s.card}
        onPress={async () => {
          const data = await exportAll();
          setMsg(`Exported ${data.income.length} income rows (Phase 4 will write this file + R2 backup).`);
        }}
      >
        <Text style={s.t}>Backup / Export</Text>
        <Text style={s.m}>Tap to build a JSON snapshot of local data.</Text>
      </Pressable>
      {!!msg && <Text style={s.sub}>{msg}</Text>}
    </View>
  );
}
const s = StyleSheet.create({
  h: { fontSize: 20, fontWeight: "600" },
  card: { backgroundColor: light.surface, borderWidth: 1, borderColor: light.border, borderRadius: 16, padding: 12, marginTop: 8 },
  t: { fontWeight: "600" }, m: { color: light.text2 }, sub: { color: light.text2, marginTop: 12 },
});

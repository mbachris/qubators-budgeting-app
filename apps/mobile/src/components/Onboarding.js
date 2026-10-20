import { useState } from "react";
import { Modal, View, Text, Pressable } from "react-native";
import { formatMoney, categoryColor } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { allocateIncome, DEFAULT_RULES } from "../domain/allocate";

// What the app does, in three screens, before the first number is typed.
// The percentages come from the live rules, so a customised split is explained correctly.
const SAMPLE = 10000000; // 100 000 BIF

const STEPS = [
  {
    kicker: "Step 1 of 3",
    title: "Income is divided the moment it arrives",
    body:
      "You never budget the whole amount. Four deductions come off every income, whatever paid it — salary, business or a gift.",
  },
  {
    kicker: "Step 2 of 3",
    title: "Only what is left is yours to spend",
    body:
      "The remainder is your pot for that month. Bills, everyday spending and planned purchases all come out of it, and each month keeps its own statement.",
  },
  {
    kicker: "Step 3 of 3",
    title: "The essentials are already handled",
    body:
      "Tithes, savings and the emergency fund are recorded as set aside automatically. Only community giving is yours to do — ceremonies or society, from the community bucket.",
  },
];

export default function Onboarding({ rules = [], onDone }) {
  const { mode } = useTheme();
  const s = useThemedStyles(makeStyles);
  const [step, setStep] = useState(0);
  const active = rules.length ? rules : DEFAULT_RULES;
  const split = allocateIncome(SAMPLE, active);
  const living = split.find((p) => p.kind === "living");
  const deductions = split.filter((p) => p.kind !== "living");
  const last = step === STEPS.length - 1;

  return (
    <Modal transparent={false} animationType="fade" visible onRequestClose={onDone}>
      <View style={s.screen}>
        <View style={s.head}>
          <Text style={s.brand}>BUDGETSAFE</Text>
          <Pressable hitSlop={10} onPress={onDone}>
            <Text style={s.skip}>Skip</Text>
          </Pressable>
        </View>

        <View style={s.body}>
          <Text style={s.kicker}>{STEPS[step].kicker}</Text>
          <Text style={s.title}>{STEPS[step].title}</Text>
          <Text style={s.text}>{STEPS[step].body}</Text>

          {step === 0 && (
            <View style={s.card}>
              <Text style={s.sample}>If you receive {formatMoney(SAMPLE)}</Text>
              {deductions.map((p) => (
                <View key={p.id} style={s.row}>
                  <View style={[s.dot, { backgroundColor: categoryColor(p.kind, mode) }]} />
                  <Text style={s.rowName}>
                    {p.name} <Text style={s.pct}>{p.percent}%</Text>
                  </Text>
                  <Text style={s.rowVal}>−{formatMoney(p.amountMinor)}</Text>
                </View>
              ))}
            </View>
          )}

          {step === 1 && (
            <View style={s.card}>
              <Text style={s.sample}>What is left to spend</Text>
              <Text style={s.big}>{formatMoney(living?.amountMinor ?? 0)}</Text>
              <Text style={s.note}>
                {living?.percent ?? 0}% of {formatMoney(SAMPLE)} — your pot for the month.
              </Text>
              <View style={s.rule} />
              <Text style={s.note}>
                Spend from it on bills, everyday items, or something you are saving up for like a car or a
                trip. Next month starts its own pot; the essentials already taken out are never counted again.
              </Text>
            </View>
          )}

          {step === 2 && (
            <View style={s.card}>
              {split.map((p) => (
                <View key={p.id} style={s.row}>
                  <View style={[s.dot, { backgroundColor: categoryColor(p.kind, mode) }]} />
                  <Text style={s.rowName}>
                    {p.kind === "living" ? "Spendable" : p.name} <Text style={s.pct}>{p.percent}%</Text>
                  </Text>
                  <Text style={s.rowVal}>{formatMoney(p.amountMinor)}</Text>
                </View>
              ))}
              <View style={s.rule} />
              <Text style={s.note}>
                Works offline, on this phone, with no account. Cloud Sync is optional, and “Back up now”
                in Settings writes one file you can mail to yourself or keep on a computer.
              </Text>
            </View>
          )}
        </View>

        <View style={s.foot}>
          <View style={s.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[s.dotMark, i === step && s.dotOn]} />
            ))}
          </View>
          <Pressable
            style={s.btn}
            onPress={() => (last ? onDone() : setStep(step + 1))}
          >
            <Text style={s.bt}>{last ? "Start budgeting" : "Next"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c) => ({
  screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 22, paddingTop: 56, paddingBottom: 34 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 11, fontWeight: "800", letterSpacing: 2, color: c.text3 },
  skip: { color: c.text2, fontWeight: "700" },
  body: { flex: 1, justifyContent: "center" },
  kicker: { color: c.primary, fontWeight: "800", fontSize: 12, letterSpacing: 1 },
  title: { fontSize: 26, lineHeight: 33, fontWeight: "800", color: c.text, marginTop: 8 },
  text: { fontSize: 16, lineHeight: 24, color: c.text2, marginTop: 10 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, marginTop: 20 },
  sample: { color: c.text2, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 999, marginRight: 8 },
  rowName: { flex: 1, color: c.text },
  pct: { color: c.text3, fontWeight: "700" },
  rowVal: { color: c.text, fontVariant: ["tabular-nums"], fontWeight: "600" },
  big: { fontSize: 32, fontWeight: "800", color: c.primary, fontVariant: ["tabular-nums"] },
  note: { color: c.text2, fontSize: 13, lineHeight: 19, marginTop: 6 },
  rule: { height: 1, backgroundColor: c.border, marginVertical: 10 },
  foot: { gap: 16 },
  dots: { flexDirection: "row", justifyContent: "center", marginBottom: 14 },
  dotMark: { width: 8, height: 8, borderRadius: 999, backgroundColor: c.border, marginHorizontal: 4 },
  dotOn: { backgroundColor: c.primary, width: 22 },
  btn: { backgroundColor: c.primary, borderRadius: 14, height: 54, alignItems: "center", justifyContent: "center" },
  bt: { color: "#fff", fontWeight: "800", fontSize: 16 },
});

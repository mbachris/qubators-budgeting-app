// Backup = one JSON file with the entire local store. The phone writes it to its own
// cache, then hands it to Android's share sheet so it can be mailed to yourself, put
// in Drive, or dropped on a computer. No server, no account, no internet needed.
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { exportAll, importAll } from "../db/repo";
import { getPref, setPref } from "./prefs";

const LAST_KEY = "backup.last";
const fileStamp = () => new Date().toISOString().slice(0, 10);

export async function lastBackup() {
  return getPref(LAST_KEY, "");
}

// Builds the file and opens the share sheet. Returns a summary for the screen.
export async function saveBackup() {
  const data = await exportAll();
  const json = JSON.stringify(data, null, 2);
  const name = `budgetsafe-${fileStamp()}.json`;
  const dir = FileSystem.cacheDirectory;
  if (!dir) throw new Error("this device has no writable storage");
  const uri = `${dir}${name}`;
  await FileSystem.writeAsStringAsync(uri, json);

  const shareable = await Sharing.isAvailableAsync();
  if (shareable) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/json",
      dialogTitle: "Send your BudgetSafe backup somewhere safe",
      UTI: "public.json",
    });
  }

  const summary = {
    name,
    uri,
    bytes: json.length,
    entries: data.counts.income_entries + data.counts.expenses + data.counts.payouts,
    shareable,
  };
  await setPref(LAST_KEY, `${fileStamp()} · ${summary.entries} entries`);
  return summary;
}

// Opens the file picker and validates the file without touching anything yet.
export async function pickBackup() {
  const res = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "*/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled) return null;
  const asset = res.assets?.[0];
  if (!asset?.uri) return null;

  const text = await FileSystem.readAsStringAsync(asset.uri);
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("that file is not a backup (it is not readable JSON)");
  }
  if (data?.app !== "BudgetSafe" || data?.format !== 3 || !data?.tables) {
    throw new Error("that file is not a BudgetSafe backup");
  }

  const c = data.counts ?? {};
  return {
    data,
    name: asset.name ?? "backup.json",
    entries: (c.income_entries ?? 0) + (c.expenses ?? 0) + (c.payouts ?? 0),
    when: data.exportedAt ? new Date(data.exportedAt).toLocaleString() : "unknown date",
  };
}

export async function restoreBackup(data) {
  const res = await importAll(data);
  await setPref(LAST_KEY, `${fileStamp()} · restored ${res.rows} rows`);
  return res;
}

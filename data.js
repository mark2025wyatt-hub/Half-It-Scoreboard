import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const usingSharedDatabase = Boolean(url && key);
const supabase = usingSharedDatabase ? createClient(url, key) : null;
const LOCAL_KEY = "half-it-all-games-v2";

export async function loadGameRecords() {
  if (!usingSharedDatabase) {
    try {
      const raw = window.localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  const { data, error } = await supabase
    .from("half_it_games")
    .select("id, played_at, mode, players")
    .order("played_at", { ascending: true })
    .limit(1000);

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    date: row.played_at,
    mode: row.mode,
    players: row.players,
  }));
}

export async function saveGameRecord(record) {
  if (!usingSharedDatabase) {
    const current = await loadGameRecords();
    const updated = [...current, record].slice(-1000);
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
    return true;
  }

  const { error } = await supabase.from("half_it_games").insert({
    id: record.id,
    played_at: record.date,
    mode: record.mode,
    players: record.players,
  });

  if (error) throw error;
  return true;
}

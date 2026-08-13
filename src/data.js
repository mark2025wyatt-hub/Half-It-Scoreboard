import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const usingSharedDatabase = Boolean(url && key);
const supabase = usingSharedDatabase ? createClient(url, key) : null;
const LOCAL_GAMES_KEY = "half-it-all-games-v2";
const LOCAL_PROFILES_KEY = "half-it-profiles-v1";

export async function loadGameRecords() {
  if (!usingSharedDatabase) {
    try {
      const raw = window.localStorage.getItem(LOCAL_GAMES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  const { data, error } = await supabase
    .from("half_it_games")
    .select("id, game_date, mode, players")
    .order("game_date", { ascending: true })
    .limit(1000);

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    date: row.game_date,
    mode: row.mode,
    players: row.players,
  }));
}

export async function saveGameRecord(record) {
  if (!usingSharedDatabase) {
    const current = await loadGameRecords();
    const updated = [...current, record].slice(-1000);
    window.localStorage.setItem(LOCAL_GAMES_KEY, JSON.stringify(updated));
    return true;
  }

  const { error } = await supabase.from("half_it_games").insert({
    id: record.id,
    game_date: record.date,
    mode: record.mode,
    players: record.players,
  });

  if (error) throw error;
  return true;
}

function mapProfile(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    nickname: row.nickname || "",
    avatar: row.avatar || "target",
    accent: row.accent || "lime",
    createdAt: row.created_at,
  };
}

export async function loadProfiles() {
  if (!usingSharedDatabase) {
    try {
      const raw = window.localStorage.getItem(LOCAL_PROFILES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  const { data, error } = await supabase
    .from("half_it_profiles")
    .select("id, display_name, nickname, avatar, accent, created_at")
    .order("display_name", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapProfile);
}

export async function createProfile(profile) {
  if (!usingSharedDatabase) {
    const current = await loadProfiles();
    const created = {
      id: `p${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
      displayName: profile.displayName,
      nickname: profile.nickname || "",
      avatar: profile.avatar || "target",
      accent: profile.accent || "lime",
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify([...current, created]));
    return created;
  }

  const { data, error } = await supabase
    .from("half_it_profiles")
    .insert({
      display_name: profile.displayName,
      nickname: profile.nickname || null,
      avatar: profile.avatar || "target",
      accent: profile.accent || "lime",
    })
    .select("id, display_name, nickname, avatar, accent, created_at")
    .single();

  if (error) throw error;
  return mapProfile(data);
}

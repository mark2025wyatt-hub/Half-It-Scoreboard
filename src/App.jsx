import React, { useEffect, useMemo, useRef, useState } from "react";
import * as dataApi from "./data.js";
import {
  Target,
  Trophy,
  Users,
  Plus,
  X,
  ChevronRight,
  Home,
  BarChart2,
  RotateCcw,
  Award,
  Delete,
  AlertCircle,
  Undo2,
  Menu,
  Volume2,
  Sparkles,
  UserCircle2,
  UserPlus,
  UserRound,
  Zap,
  Medal,
  Shield,
  LogOut,
  Trash2,
  Pencil,
  History,
  Save,
} from "lucide-react";

const {
  loadGameRecords,
  saveGameRecord,
  loadProfiles,
  createProfile,
  usingSharedDatabase,
  getAdminStatus,
  signInAdmin,
  signOutAdmin,
  updateGamePlayers,
  deleteGameRecord,
  updateProfileRecord,
  deleteProfileRecord,
  loadAdminAudit,
  logAdminAction,
} = dataApi;

const ACTIVE_GAME_KEY = "half-it-active-game-v1";

const ROUNDS = [
  { name: "20s", rule: "Enter 1–9 based on the number of scoring 20s hit", kind: "units", min: 1, max: 9, multiplier: 20 },
  { name: "19s", rule: "Enter 1–9 based on the number of scoring 19s hit", kind: "units", min: 1, max: 9, multiplier: 19 },
  { name: "Triples", rule: "Enter the points scored with triples", kind: "score", min: 1, max: 180 },
  { name: "18s", rule: "Enter 1–9 based on the number of scoring 18s hit", kind: "units", min: 1, max: 9, multiplier: 18 },
  { name: "17s", rule: "Enter 1–9 based on the number of scoring 17s hit", kind: "units", min: 1, max: 9, multiplier: 17 },
  { name: "Doubles", rule: "Enter the points scored with doubles", kind: "score", min: 1, max: 120 },
  { name: "16s", rule: "Enter 1–9 based on the number of scoring 16s hit", kind: "units", min: 1, max: 9, multiplier: 16 },
  { name: "15s", rule: "Enter 1–9 based on the number of scoring 15s hit", kind: "units", min: 1, max: 9, multiplier: 15 },
  { name: "45", rule: "Score exactly 45 with 3 darts, otherwise Half It", kind: "fixed", fixedPoints: 45 },
  { name: "14s", rule: "Enter 1–9 based on the number of scoring 14s hit", kind: "units", min: 1, max: 9, multiplier: 14 },
  { name: "13s", rule: "Enter 1–9 based on the number of scoring 13s hit", kind: "units", min: 1, max: 9, multiplier: 13 },
  { name: "3 Colours", rule: "Enter the total score from the successful 3-colour visit (1–180)", kind: "score", min: 1, max: 180 },
  { name: "12s", rule: "Enter 1–9 based on the number of scoring 12s hit", kind: "units", min: 1, max: 9, multiplier: 12 },
  { name: "11s", rule: "Enter 1–9 based on the number of scoring 11s hit", kind: "units", min: 1, max: 9, multiplier: 11 },
  { name: "Bulls", rule: "Enter 1–6 bull units; each unit is worth 25 points", kind: "units", min: 1, max: 6, multiplier: 25 },
];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function wedgePath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const p1 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p3 = polarToCartesian(cx, cy, rInner, startAngle);
  const p4 = polarToCartesian(cx, cy, rInner, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${largeArc} 1 ${p4.x} ${p4.y} Z`;
}

function RoundRing({ roundIndex, size = 92 }) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 4;
  const rInner = size / 2 - 14;
  const seg = 360 / ROUNDS.length;
  const gap = 2.4;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="round-ring">
      {ROUNDS.map((_, i) => {
        const start = i * seg + gap / 2;
        const end = (i + 1) * seg - gap / 2;
        const state = i < roundIndex ? "done" : i === roundIndex ? "current" : "upcoming";
        return (
          <path
            key={i}
            d={wedgePath(cx, cy, rOuter, rInner, start, end)}
            className={`ring-seg ring-seg-${state}`}
          />
        );
      })}
      <text x={cx} y={cy - 3} textAnchor="middle" className="ring-num">{roundIndex + 1}</text>
      <text x={cx} y={cy + 13} textAnchor="middle" className="ring-total">OF {ROUNDS.length}</text>
    </svg>
  );
}

function MiniScoreChart({ scores = [] }) {
  const values = scores.slice(-10);
  if (values.length < 2) return <div className="chart-empty">Play at least 2 games to see your form chart.</div>;
  const width = 320, height = 116, padX = 14, padY = 14;
  const min = Math.min(...values), max = Math.max(...values);
  const range = Math.max(1, max - min);
  const pts = values.map((v, i) => {
    const x = padX + (i * (width - padX * 2)) / Math.max(1, values.length - 1);
    const y = height - padY - ((v - min) / range) * (height - padY * 2);
    return { x, y, v };
  });
  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  return (
    <div className="score-chart-wrap">
      <svg className="score-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Last ten scores chart">
        <line x1={padX} y1={height-padY} x2={width-padX} y2={height-padY} className="chart-axis" />
        <polyline points={polyline} className="chart-line" />
        {pts.map((p,i) => <g key={i}><circle cx={p.x} cy={p.y} r="4" className="chart-dot"/><text x={p.x} y={Math.max(10,p.y-9)} textAnchor="middle" className="chart-label">{p.v}</text></g>)}
      </svg>
    </div>
  );
}

export default function HalfItScoreboard() {
  const [screen, setScreen] = useState("home");
  const [gameMode, setGameMode] = useState("multiplayer");
  const [players, setPlayers] = useState([]);
  const [nameInput, setNameInput] = useState("");
  const [roundIndex, setRoundIndex] = useState(0);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [scoreInput, setScoreInput] = useState("");
  const [dartVisit, setDartVisit] = useState([]);
  const [flash, setFlash] = useState(null);
  const [allGames, setAllGames] = useState(null);
  const [storageError, setStorageError] = useState(false);
  const [savingGame, setSavingGame] = useState(false);
  const [statsName, setStatsName] = useState("");
  const [statsFilter, setStatsFilter] = useState("all");
  const [leaderboardTab, setLeaderboardTab] = useState("scores");
  const [lastAction, setLastAction] = useState(null);
  const [undoHistory, setUndoHistory] = useState([]);
  const [scoreAnimation, setScoreAnimation] = useState(null);
  const [roundSummary, setRoundSummary] = useState(false);
  const [roundTransition, setRoundTransition] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resultAwards, setResultAwards] = useState({});
  const [savedActiveGame, setSavedActiveGame] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [profileForm, setProfileForm] = useState({ displayName: "", nickname: "", avatar: "target", accent: "lime" });
  const [profileReturn, setProfileReturn] = useState("players");
  const [statsProfileId, setStatsProfileId] = useState(null);
  const [roundStartScores, setRoundStartScores] = useState({});
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const touchDragIndexRef = useRef(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalledApp, setIsInstalledApp] = useState(false);
  const [adminSession, setAdminSession] = useState(null);
  const [adminRole, setAdminRole] = useState(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminTab, setAdminTab] = useState("games");
  const [adminAudit, setAdminAudit] = useState([]);


  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
    setIsInstalledApp(Boolean(standalone));
    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setIsInstalledApp(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch {}
    setInstallPrompt(null);
  }

  useEffect(() => {
    loadGames();
    loadPlayerProfiles();
    refreshAdminStatus();
    try {
      const saved = JSON.parse(localStorage.getItem(ACTIVE_GAME_KEY) || "null");
      if (saved?.players?.length && saved.roundIndex < ROUNDS.length) {
        setSavedActiveGame(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (screen === "game" && players.length) {
      const snapshot = { gameMode, players, roundIndex, playerIndex, scoreInput, dartVisit, roundSummary, lastAction, undoHistory, roundStartScores };
      localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(snapshot));
      setSavedActiveGame(snapshot);
    }
  }, [screen, gameMode, players, roundIndex, playerIndex, scoreInput, dartVisit, roundSummary, lastAction, undoHistory, roundStartScores]);

  useEffect(() => {
    let lock;
    async function keepAwake() {
      if (screen === "game" && "wakeLock" in navigator) {
        try { lock = await navigator.wakeLock.request("screen"); } catch {}
      }
    }
    keepAwake();
    return () => { try { lock?.release(); } catch {} };
  }, [screen]);

  // Desktop/laptop keyboard controls. These only activate on wide screens and
  // call the same scoring functions as the mobile UI, so game rules stay identical.
  useEffect(() => {
    if (screen !== "game") return;

    function onDesktopKeyDown(e) {
      if (window.innerWidth < 900) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      const key = e.key.toLowerCase();

      if (key === "h") {
        e.preventDefault();
        halfIt();
        return;
      }

      if (key === "u") {
        if (undoHistory.length || lastAction) {
          e.preventDefault();
          undoLastThrow();
        }
        return;
      }

      if (isNumberTargetRound()) {
        if (key === "1") { e.preventDefault(); selectDartResult("single"); return; }
        if (key === "2") { e.preventDefault(); selectDartResult("double"); return; }
        if (key === "3") { e.preventDefault(); selectDartResult("triple"); return; }
        if (key === "0") { e.preventDefault(); selectDartResult("miss"); return; }
        if (key === "backspace") {
          if (dartVisit.length) { e.preventDefault(); undoDart(); }
          return;
        }
        if (key === "enter" && dartVisit.length === 3) {
          e.preventDefault();
          submitDartVisit();
        }
        return;
      }

      if (round?.kind === "fixed") {
        if (key === "enter") {
          e.preventDefault();
          submitFixedScore();
        }
        return;
      }

      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        keypadPress(Number(key));
        return;
      }

      if (key === "backspace") {
        if (scoreInput !== "") {
          e.preventDefault();
          keypadPress("back");
        }
        return;
      }

      if (key === "escape") {
        if (scoreInput !== "") {
          e.preventDefault();
          keypadPress("clear");
        }
        return;
      }

      if (key === "enter" && scoreInput !== "") {
        e.preventDefault();
        keypadPress("enter");
      }
    }

    window.addEventListener("keydown", onDesktopKeyDown);
    return () => window.removeEventListener("keydown", onDesktopKeyDown);
  }, [screen, roundIndex, playerIndex, dartVisit, scoreInput, players, undoHistory, lastAction, roundSummary]);

  async function loadPlayerProfiles() {
    setProfilesLoading(true);
    try {
      const rows = await loadProfiles();
      setProfiles(rows);
      setProfileError("");
    } catch {
      setProfiles([]);
      setProfileError("Player profiles could not be loaded.");
    }
    setProfilesLoading(false);
  }

  function openCreateProfile(returnTo = "players") {
    setProfileReturn(returnTo);
    setProfileForm({ displayName: "", nickname: "", avatar: "target", accent: "lime" });
    setProfileError("");
    setScreen("createProfile");
  }

  async function submitProfile() {
    const displayName = profileForm.displayName.trim();
    if (!displayName) {
      setProfileError("Enter a display name.");
      return;
    }
    if (profiles.some(p => p.displayName.toLowerCase() === displayName.toLowerCase())) {
      setProfileError("That player name already has a profile.");
      return;
    }
    try {
      const profile = await createProfile({
        displayName,
        nickname: profileForm.nickname.trim(),
        avatar: profileForm.avatar,
        accent: profileForm.accent,
      });
      setProfiles(current => [...current, profile].sort((a,b) => a.displayName.localeCompare(b.displayName)));
      setProfileError("");
      if (profileReturn === "setup") {
        addSavedProfile(profile);
        setScreen("setup");
      } else {
        setScreen("players");
      }
    } catch (err) {
      setProfileError(err?.message || "Profile could not be created.");
    }
  }

  function addSavedProfile(profile) {
    if (!profile) return;
    if (gameMode === "solo" && players.length >= 1) return;
    if (players.some(p => p.profileId === profile.id)) return;
    setPlayers(current => [...current, {
      profileId: profile.id,
      name: profile.displayName,
      nickname: profile.nickname || "",
      avatar: profile.avatar || "target",
      accent: profile.accent || "lime",
      guest: false,
      score: 0,
      history: [],
    }]);
  }

  function viewProfile(profile) {
    setStatsProfileId(profile.id);
    setStatsName(profile.displayName);
    setStatsFilter("all");
    setScreen("personal");
  }

  async function refreshAdminStatus() {
    if (!usingSharedDatabase) { setAdminSession(null); setAdminRole(null); return false; }
    try {
      const status = await getAdminStatus();
      setAdminSession(status.session);
      setAdminRole(status.isAdmin ? status.role : null);
      return Boolean(status.isAdmin);
    } catch {
      setAdminSession(null); setAdminRole(null); return false;
    }
  }

  async function openAdmin() {
    const ok = await refreshAdminStatus();
    setAdminError("");
    if (ok) { await refreshAdminAudit(); setScreen("admin"); }
    else setScreen("adminLogin");
  }

  async function handleAdminLogin(e) {
    e?.preventDefault?.();
    if (!adminEmail.trim() || !adminPassword) { setAdminError("Enter your moderator email and password."); return; }
    setAdminBusy(true); setAdminError("");
    try {
      const status = await signInAdmin(adminEmail.trim(), adminPassword);
      setAdminSession(status.session); setAdminRole(status.role || "moderator"); setAdminPassword("");
      await Promise.all([loadGames(), loadPlayerProfiles(), refreshAdminAudit()]);
      setScreen("admin");
    } catch (err) { setAdminError(err?.message || "Moderator login failed."); }
    setAdminBusy(false);
  }

  async function handleAdminLogout() {
    try { await signOutAdmin(); } catch {}
    setAdminSession(null); setAdminRole(null); setAdminPassword(""); setAdminAudit([]); setScreen("home");
  }

  async function refreshAdminAudit() {
    try { setAdminAudit(await loadAdminAudit()); } catch { setAdminAudit([]); }
  }

  function recomputeWinners(game, nextPlayers) {
    if (game.mode !== "multiplayer") return nextPlayers.map(p => ({ ...p, won:false }));
    const top = Math.max(...nextPlayers.map(p => Number(p.score) || 0));
    return nextPlayers.map(p => ({ ...p, won:(Number(p.score) || 0) === top }));
  }

  async function adminEditScore(game, playerIndexToEdit) {
    const player = game.players[playerIndexToEdit];
    const raw = prompt(`New score for ${player.name}`, String(player.score));
    if (raw === null) return;
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0 || !Number.isInteger(score)) { alert("Enter a whole number of 0 or more."); return; }
    setAdminBusy(true);
    try {
      const next = game.players.map((p,i) => i===playerIndexToEdit ? {...p,score} : {...p});
      const recalculated = recomputeWinners(game,next);
      await updateGamePlayers(game.id,recalculated);
      await logAdminAction("edit_score",{gameId:game.id,player:player.name,from:player.score,to:score});
      await Promise.all([loadGames(),refreshAdminAudit()]);
    } catch (err) { alert(err?.message || "Score could not be updated."); }
    setAdminBusy(false);
  }

  async function adminRemoveResult(game, playerIndexToRemove) {
    const player = game.players[playerIndexToRemove];
    const wouldDeleteGame = game.mode === "solo" || game.players.length <= 2;
    const msg = wouldDeleteGame
      ? `Removing ${player.name}'s result would leave this game invalid, so the entire game will be deleted. Continue?`
      : `Remove ${player.name}'s result from this game? Their averages, PB and leaderboard stats will recalculate automatically.`;
    if (!confirm(msg)) return;
    setAdminBusy(true);
    try {
      if (wouldDeleteGame) await deleteGameRecord(game.id);
      else {
        const next = recomputeWinners(game, game.players.filter((_,i)=>i!==playerIndexToRemove));
        await updateGamePlayers(game.id,next);
      }
      await logAdminAction("remove_result",{gameId:game.id,player:player.name,deletedGame:wouldDeleteGame});
      await Promise.all([loadGames(),refreshAdminAudit()]);
    } catch (err) { alert(err?.message || "Result could not be removed."); }
    setAdminBusy(false);
  }

  async function adminDeleteGame(game) {
    if (!confirm(`Delete this ${game.mode} game from ${new Date(game.date).toLocaleString()}? This cannot be undone.`)) return;
    setAdminBusy(true);
    try {
      await deleteGameRecord(game.id);
      await logAdminAction("delete_game",{gameId:game.id,mode:game.mode,date:game.date,players:game.players.map(p=>p.name)});
      await Promise.all([loadGames(),refreshAdminAudit()]);
    } catch (err) { alert(err?.message || "Game could not be deleted."); }
    setAdminBusy(false);
  }

  async function adminEditProfile(profile) {
    const displayName = prompt("Display name", profile.displayName);
    if (displayName === null) return;
    const trimmed = displayName.trim();
    if (!trimmed) { alert("Display name cannot be empty."); return; }
    const nickname = prompt("Nickname (optional)", profile.nickname || "");
    if (nickname === null) return;
    setAdminBusy(true);
    try {
      await updateProfileRecord(profile.id,{displayName:trimmed,nickname:nickname.trim()});
      await logAdminAction("edit_profile",{profileId:profile.id,from:profile.displayName,to:trimmed});
      await Promise.all([loadPlayerProfiles(),refreshAdminAudit()]);
    } catch (err) { alert(err?.message || "Profile could not be updated."); }
    setAdminBusy(false);
  }

  async function resetProfileHistory(profile) {
    if (!confirm(`Reset ALL tracked scores for ${profile.displayName}? Their profile will remain, but solo and multiplayer history will be removed.`)) return;
    if (!confirm("This will recalculate leaderboards, averages, wins and personal bests. Continue?")) return;
    setAdminBusy(true);
    try {
      const affected = (allGames || []).filter(g => g.players?.some(p => p.profileId === profile.id));
      for (const game of affected) {
        const remaining = game.players.filter(p => p.profileId !== profile.id);
        if (game.mode === "solo" || (game.mode === "multiplayer" && remaining.length < 2)) await deleteGameRecord(game.id);
        else await updateGamePlayers(game.id,recomputeWinners(game,remaining));
      }
      await logAdminAction("reset_profile_history",{profileId:profile.id,player:profile.displayName,gamesAffected:affected.length});
      await Promise.all([loadGames(),refreshAdminAudit()]);
    } catch (err) { alert(err?.message || "Player history could not be reset."); }
    setAdminBusy(false);
  }

  async function adminDeleteProfile(profile) {
    const typed = prompt(`Delete ${profile.displayName}'s profile AND all linked history? Type DELETE to confirm.`);
    if (typed !== "DELETE") return;
    setAdminBusy(true);
    try {
      const affected = (allGames || []).filter(g => g.players?.some(p => p.profileId === profile.id));
      for (const game of affected) {
        const remaining = game.players.filter(p => p.profileId !== profile.id);
        if (game.mode === "solo" || (game.mode === "multiplayer" && remaining.length < 2)) await deleteGameRecord(game.id);
        else await updateGamePlayers(game.id,recomputeWinners(game,remaining));
      }
      await deleteProfileRecord(profile.id);
      await logAdminAction("delete_profile",{profileId:profile.id,player:profile.displayName,gamesAffected:affected.length});
      await Promise.all([loadGames(),loadPlayerProfiles(),refreshAdminAudit()]);
    } catch (err) { alert(err?.message || "Profile could not be deleted."); }
    setAdminBusy(false);
  }

  async function loadGames() {
    try {
      const records = await loadGameRecords();
      setAllGames(records);
      setStorageError(false);
    } catch {
      setAllGames([]);
      setStorageError(true);
    }
  }

  async function saveGame(record) {
    setSavingGame(true);
    try {
      const saved = await saveGameRecord(record);
      if (saved) {
        setAllGames((current) => [...(current || []), record].slice(-1000));
        setStorageError(false);
      } else {
        setStorageError(true);
      }
    } catch {
      setStorageError(true);
    }
    setSavingGame(false);
  }

  function resumeSavedGame() {
    if (!savedActiveGame?.players?.length) return;
    setGameMode(savedActiveGame.gameMode || "multiplayer");
    setPlayers(savedActiveGame.players);
    setRoundIndex(savedActiveGame.roundIndex || 0);
    setPlayerIndex(savedActiveGame.playerIndex || 0);
    setScoreInput(savedActiveGame.scoreInput || "");
    setDartVisit(savedActiveGame.dartVisit || []);
    setRoundSummary(Boolean(savedActiveGame.roundSummary));
    const restoredUndo = Array.isArray(savedActiveGame.undoHistory)
      ? savedActiveGame.undoHistory
      : (savedActiveGame.lastAction ? [savedActiveGame.lastAction] : []);
    setUndoHistory(restoredUndo);
    setLastAction(restoredUndo[restoredUndo.length - 1] || savedActiveGame.lastAction || null);
    setRoundStartScores(savedActiveGame.roundStartScores || Object.fromEntries(savedActiveGame.players.map(p => [p.profileId || p.name, p.score || 0])));
    setScreen("game");
  }

  function startFreshSetup(mode) {
    if (savedActiveGame?.players?.length && !confirm("Start a new game? Your current game is still in progress and will be replaced.")) return;
    localStorage.removeItem(ACTIVE_GAME_KEY);
    setSavedActiveGame(null);
    beginSetup(mode);
  }

  function beginSetup(mode) {
    setGameMode(mode);
    setPlayers([]);
    setNameInput("");
    setScoreInput("");
    setScreen("setup");
  }

  function addPlayer() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    if (players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setNameInput("");
      return;
    }
    if (gameMode === "solo" && players.length >= 1) return;
    setPlayers([...players, { profileId: null, name: trimmed, nickname: "", avatar: "guest", accent: "slate", guest: true, score: 0, history: [] }]);
    setNameInput("");
  }

  function removePlayer(idx) {
    setPlayers(players.filter((_, i) => i !== idx));
  }

  function startGame() {
    const minimum = gameMode === "solo" ? 1 : 2;
    if (players.length < minimum) return;
    setRoundIndex(0);
    setPlayerIndex(0);
    setScoreInput("");
    setDartVisit([]);
    setLastAction(null);
    setUndoHistory([]);
    setRoundStartScores(Object.fromEntries(players.map(p => [p.profileId || p.name, p.score || 0])));
    setScreen("game");
  }

  function playHalfSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth"; osc.frequency.setValueAtTime(180, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(85, ctx.currentTime + .28);
      gain.gain.setValueAtTime(.16, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .32);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .33);
    } catch {}
  }

  function advanceTurn(updatedPlayers) {
    setDartVisit([]);
    if (playerIndex + 1 < updatedPlayers.length) {
      setPlayerIndex(playerIndex + 1);
      setScoreInput("");
      return;
    }
    if (roundIndex + 1 < ROUNDS.length) {
      if (gameMode === "multiplayer") {
        setRoundSummary(true);
      } else {
        beginNextRound();
      }
      setScoreInput("");
      return;
    }
    if (gameMode === "multiplayer") {
      setRoundSummary(true);
    } else {
      finishGame(updatedPlayers);
    }
    setScoreInput("");
  }

  function beginNextRound() {
    setDartVisit([]);
    const nextIndex = roundIndex + 1;
    if (nextIndex >= ROUNDS.length) return;
    setRoundSummary(false);
    setRoundStartScores(Object.fromEntries(players.map(p => [p.profileId || p.name, p.score || 0])));
    setRoundTransition({ index: nextIndex, name: ROUNDS[nextIndex].name });
    setTimeout(() => {
      setRoundIndex(nextIndex);
      setPlayerIndex(0);
      setRoundTransition(null);
    }, 650);
  }

  function addPoints(points, enteredValue = null) {
    const before = players;
    const actor = players[playerIndex];
    const updated = players.map((p, i) => i === playerIndex ? {
      ...p, score: p.score + points,
      history: [...p.history, { round: ROUNDS[roundIndex].name, delta: points, half: false, enteredValue }],
    } : p);
    const actionSnapshot = { players: before, roundIndex, playerIndex, roundStartScores, actor: actor.name, label: `+${points}` };
    setUndoHistory(history => [...history, actionSnapshot]);
    setLastAction(actionSnapshot);
    setPlayers(updated);
    setFlash({ i: playerIndex, type: "score" });
    setScoreAnimation({ type: "score", text: `+${points}` });
    setTimeout(() => { setFlash(null); setScoreAnimation(null); advanceTurn(updated); }, 520);
  }

  function isNumberTargetRound(r = round) {
    return r?.kind === "units" && r.multiplier >= 11 && r.multiplier <= 20;
  }

  function selectDartResult(type) {
    if (!isNumberTargetRound() || dartVisit.length >= 3) return;
    const multiplier = type === "single" ? 1 : type === "double" ? 2 : type === "triple" ? 3 : 0;
    const dart = { type, multiplier, points: round.multiplier * multiplier };
    const next = [...dartVisit, dart];
    setDartVisit(next);
    if (next.length === 3 && next.every(d => d.type === "miss")) {
      setTimeout(() => halfIt(), 180);
    }
  }

  function undoDart() {
    setDartVisit(v => v.slice(0, -1));
  }

  function submitDartVisit() {
    if (dartVisit.length !== 3) return;
    if (dartVisit.every(d => d.type === "miss")) { halfIt(); return; }
    const points = dartVisit.reduce((sum, d) => sum + d.points, 0);
    addPoints(points, { darts: dartVisit });
  }

  function submitScore() {
    const entered = parseInt(scoreInput, 10);
    if (Number.isNaN(entered)) return;

    if (round.kind === "units") {
      if (entered < round.min || entered > round.max) return;
      addPoints(entered * round.multiplier, entered);
      return;
    }

    if (round.kind === "score") {
      if (entered < round.min || entered > round.max) return;
      addPoints(entered, entered);
    }
  }

  function submitFixedScore() {
    if (round.kind !== "fixed") return;
    addPoints(round.fixedPoints, round.fixedPoints);
  }

  function halfIt() {
    const before = players;
    const actor = players[playerIndex];
    const oldScore = actor.score;
    const newScore = Math.floor(oldScore / 2);
    const updated = players.map((p, i) => i !== playerIndex ? p : {
      ...p, score: newScore,
      history: [...p.history, { round: ROUNDS[roundIndex].name, delta: newScore - p.score, half: true }],
    });
    const actionSnapshot = { players: before, roundIndex, playerIndex, roundStartScores, actor: actor.name, label: `${oldScore} → ${newScore}` };
    setUndoHistory(history => [...history, actionSnapshot]);
    setLastAction(actionSnapshot);
    setPlayers(updated); playHalfSound();
    setFlash({ i: playerIndex, type: "half" });
    setScoreAnimation({ type: "half", text: `${oldScore} → ${newScore}` });
    setTimeout(() => { setFlash(null); setScoreAnimation(null); advanceTurn(updated); }, 620);
  }

  function undoLastThrow() {
    const history = undoHistory.length ? undoHistory : (lastAction ? [lastAction] : []);
    if (!history.length) return;

    const action = history[history.length - 1];
    const remaining = history.slice(0, -1);

    setPlayers(action.players);
    setRoundIndex(action.roundIndex);
    setPlayerIndex(action.playerIndex);
    if (action.roundStartScores) setRoundStartScores(action.roundStartScores);
    setRoundSummary(false);
    setRoundTransition(null);
    setScoreInput("");
    setDartVisit([]);
    setFlash(null);
    setScoreAnimation(null);
    setUndoHistory(remaining);
    setLastAction(remaining[remaining.length - 1] || null);
  }

  function finishGame(finalPlayers) {
    const ranked = [...finalPlayers].sort((a, b) => b.score - a.score);
    const topScore = ranked[0]?.score;
    const previousByName = {};
    (allGames || []).forEach(g => g.players?.forEach(p => {
      const k = p.name.toLowerCase(); previousByName[k] = Math.max(previousByName[k] ?? -1, p.score);
    }));
    const previousOverall = Math.max(-1, ...(allGames || []).filter(g => g.mode === "multiplayer").flatMap(g => g.players?.map(p => p.score) || []));
    const awards = {};
    ranked.forEach(p => {
      const previousForProfile = (allGames || []).flatMap(g => g.players || [])
        .filter(old => p.profileId ? old.profileId === p.profileId : old.name?.toLowerCase() === p.name.toLowerCase())
        .reduce((best, old) => Math.max(best, old.score ?? -1), -1);
      awards[p.profileId || p.name] = {
        personalBest: !p.guest && p.score > previousForProfile,
        allTime: gameMode === "multiplayer" && p.score > previousOverall
      };
    });
    setResultAwards(awards);
    const record = { id: `g${Date.now()}`, date: new Date().toISOString(), mode: gameMode,
      players: ranked.map(p => ({
        profileId: p.profileId || null,
        name:p.name,
        guest:Boolean(p.guest),
        score:p.score,
        halfIts:(p.history || []).filter(h => h.half).length,
        bestRound:Math.max(0, ...(p.history || []).filter(h => !h.half).map(h => h.delta || 0)),
        won:gameMode === "multiplayer" && p.score === topScore
      })) };
    saveGame(record); setPlayers(finalPlayers); setLastAction(null); setUndoHistory([]); localStorage.removeItem(ACTIVE_GAME_KEY); setSavedActiveGame(null); setScreen("results");
  }

  function playAgain() {
    setPlayers(players.map((p) => ({ ...p, score: 0, history: [] })));
    setRoundIndex(0);
    setPlayerIndex(0);
    setScoreInput("");
    setDartVisit([]);
    setRoundStartScores(Object.fromEntries(players.map(p => [p.profileId || p.name, 0])));
    setLastAction(null);
    setUndoHistory([]);
    setRoundSummary(false);
    setScreen("game");
  }

  function randomizePlayers() {
    setPlayers(current => {
      const shuffled = [...current];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }

  function reorderPlayers(fromIndex, toIndex) {
    if (fromIndex === null || toIndex === null || fromIndex === toIndex) return;
    setPlayers(current => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= current.length || toIndex >= current.length) return current;
      const reordered = [...current];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      return reordered;
    });
  }

  function finishPlayerDrag() {
    setDraggingIndex(null);
    setDragOverIndex(null);
    touchDragIndexRef.current = null;
  }

  function handleTouchStart(index) {
    touchDragIndexRef.current = index;
    setDraggingIndex(index);
    setDragOverIndex(index);
  }

  function handleTouchMove(e) {
    if (touchDragIndexRef.current === null) return;
    if (!e.touches || !e.touches.length) return;
    e.preventDefault();
    const touch = e.touches[0];
    const hit = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!hit) return;
    const row = hit.closest('[data-order-index]');
    if (!row) return;
    const toIndex = Number(row.getAttribute('data-order-index'));
    const fromIndex = touchDragIndexRef.current;
    if (!Number.isInteger(toIndex) || toIndex === fromIndex) return;
    reorderPlayers(fromIndex, toIndex);
    touchDragIndexRef.current = toIndex;
    setDraggingIndex(toIndex);
    setDragOverIndex(toIndex);
  }

  function changePlayers() {
    beginSetup(gameMode);
  }

  function keypadPress(value) {
    if (value === "back") {
      setScoreInput((s) => s.slice(0, -1));
      return;
    }
    if (value === "clear") {
      setScoreInput("");
      return;
    }
    if (value === "enter") {
      if (scoreInput !== "") submitScore();
      return;
    }

    if (round.kind === "units") {
      const numeric = Number(value);
      if (numeric >= round.min && numeric <= round.max) setScoreInput(String(numeric));
      return;
    }

    setScoreInput((s) => {
      const candidate = `${s}${value}`.replace(/^0+/, "");
      if (!candidate) return "";
      if (candidate.length > 3) return s;
      const numeric = Number(candidate);
      if (numeric > round.max) return s;
      return candidate;
    });
  }

  const multiplayerLeaderboard = useMemo(() => {
    if (!allGames) return [];
    const entries = [];
    allGames
      .filter((g) => g.mode === "multiplayer" || (!g.mode && g.players?.length >= 2))
      .forEach((g) =>
        g.players.forEach((p) => entries.push({ ...p, date: g.date, gameId: g.id }))
      );
    return entries.sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date)).slice(0, 50);
  }, [allGames]);

  const soloNames = useMemo(() => {
    if (!allGames) return [];
    const names = new Set();
    allGames.forEach(g => g.players?.forEach(p => names.add(p.name)));
    return Array.from(names).sort((a,b) => a.localeCompare(b));
  }, [allGames]);

  const personalStats = useMemo(() => {
    if (!allGames || (!statsName.trim() && !statsProfileId)) return null;
    const lower = statsName.trim().toLowerCase();
    const rows = [];
    allGames.forEach(g => {
      if (statsFilter !== "all" && g.mode !== statsFilter) return;
      const mine = g.players?.find(p => {
        if (statsProfileId && p.profileId) return p.profileId === statsProfileId;
        return p.name?.toLowerCase() === lower;
      });
      if (mine) rows.push({ ...mine, date:g.date, gameId:g.id, mode:g.mode || (g.players?.length > 1 ? "multiplayer" : "solo") });
    });
    if (!rows.length) return { found:false };
    const scores = rows.map(r => r.score);
    const best = Math.max(...scores);
    const avg = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
    const wins = rows.filter(r => r.won).length;
    const chronological = [...rows].sort((a,b)=>new Date(a.date)-new Date(b.date));
    const last10 = chronological.slice(-10);
    const last10Avg = Math.round(last10.reduce((sum,r)=>sum+r.score,0)/last10.length);
    const avgDelta = last10Avg - avg;
    const totalHalfIts = rows.reduce((sum,r)=>sum+(Number(r.halfIts)||0),0);
    const rowsWithHalfData = rows.filter(r => Number.isFinite(Number(r.halfIts)));
    const avgHalfIts = rowsWithHalfData.length ? (rowsWithHalfData.reduce((sum,r)=>sum+Number(r.halfIts||0),0)/rowsWithHalfData.length).toFixed(1) : "—";
    const noHalfGames = rowsWithHalfData.filter(r => Number(r.halfIts) === 0).length;
    const globalMultiBest = Math.max(-1, ...(allGames || []).filter(g=>g.mode==="multiplayer").flatMap(g=>g.players?.map(p=>p.score)||[]));
    const achievements = [
      rows.length >= 1 && { icon:"🎯", title:"First Game", detail:"Completed your first tracked game" },
      rows.length >= 10 && { icon:"🔟", title:"10 Games", detail:"Ten tracked games completed" },
      rows.length >= 50 && { icon:"🏅", title:"50 Games", detail:"Fifty tracked games completed" },
      rows.length >= 100 && { icon:"💯", title:"100 Games", detail:"One hundred tracked games completed" },
      best >= 600 && { icon:"🏆", title:"600 Club", detail:"Scored 600 or more" },
      best >= 700 && { icon:"⚡", title:"700 Club", detail:"Scored 700 or more" },
      wins >= 1 && { icon:"👑", title:"Match Winner", detail:"Won a multiplayer game" },
      noHalfGames >= 1 && { icon:"🔥", title:"No Halves", detail:"Finished a game without a Half It" },
      statsFilter !== "solo" && best === globalMultiBest && globalMultiBest >= 0 && { icon:"🌟", title:"All-Time #1", detail:"Owns the highest competitive score" },
    ].filter(Boolean);
    return {
      found:true, gamesPlayed:rows.length, best, avg, wins, totalHalfIts, avgHalfIts, noHalfGames,
      last10, last10Avg, avgDelta, achievements,
      recent:[...chronological].reverse().slice(0,10),
      highScores:[...rows].sort((a,b)=>b.score-a.score || new Date(b.date)-new Date(a.date))
    };
  }, [allGames, statsName, statsProfileId, statsFilter]);

  const playerRankings = useMemo(() => {
    if (!allGames) return [];
    return profiles.map(profile => {
      const rows=[];
      allGames.filter(g=>g.mode==="multiplayer").forEach(g => {
        const p=g.players?.find(x => x.profileId === profile.id || (!x.profileId && x.name?.toLowerCase()===profile.displayName.toLowerCase()));
        if (p) rows.push({...p,date:g.date});
      });
      if (!rows.length) return null;
      const best=Math.max(...rows.map(r=>r.score));
      const avg=Math.round(rows.reduce((s,r)=>s+r.score,0)/rows.length);
      const wins=rows.filter(r=>r.won).length;
      const halfRows=rows.filter(r=>Number.isFinite(Number(r.halfIts)));
      const avgHalfIts=halfRows.length ? halfRows.reduce((s,r)=>s+Number(r.halfIts||0),0)/halfRows.length : null;
      return { profile, best, avg, wins, games:rows.length, avgHalfIts };
    }).filter(Boolean).sort((a,b)=>b.best-a.best || b.avg-a.avg || b.wins-a.wins);
  }, [allGames, profiles]);

  const leaderboardRecords = useMemo(() => {
    const multi=(allGames||[]).filter(g=>g.mode==="multiplayer");
    const entries=multi.flatMap(g=>(g.players||[]).map(p=>({...p,date:g.date,gameId:g.id})));
    const highest=entries.length ? [...entries].sort((a,b)=>b.score-a.score)[0] : null;
    const mostWins=playerRankings.length ? [...playerRankings].sort((a,b)=>b.wins-a.wins || b.best-a.best)[0] : null;
    const mostGames=playerRankings.length ? [...playerRankings].sort((a,b)=>b.games-a.games || b.best-a.best)[0] : null;
    const highestAvg=playerRankings.length ? [...playerRankings].sort((a,b)=>b.avg-a.avg || b.best-a.best)[0] : null;
    const eligibleHalf=playerRankings.filter(r=>r.avgHalfIts !== null && r.games >= 3);
    const fewestHalf=eligibleHalf.length ? [...eligibleHalf].sort((a,b)=>a.avgHalfIts-b.avgHalfIts || b.games-a.games)[0] : null;
    return { highest, mostWins, mostGames, highestAvg, fewestHalf };
  }, [allGames, playerRankings]);

  const selectedStatsProfile = useMemo(
    () => profiles.find(p => p.id === statsProfileId) || null,
    [profiles, statsProfileId]
  );

  const avatarGlyph = (avatar) => avatar === "trophy" ? "🏆" : avatar === "bolt" ? "⚡" : avatar === "dart" ? "🎯" : avatar === "medal" ? "🏅" : avatar === "guest" ? "G" : "◎";

  const current = players[playerIndex];
  const next = players.length > 1 ? players[(playerIndex + 1) % players.length] : null;
  const round = ROUNDS[roundIndex];
  const canStart = gameMode === "solo" ? players.length === 1 : players.length >= 2;

  const defendingChampion = useMemo(() => {
    const games = (allGames || []).filter(g => g.mode === "multiplayer").sort((a,b) => new Date(b.date) - new Date(a.date));
    return games[0]?.players?.find(p => p.won) || null;
  }, [allGames]);

  const isDefendingChampion = (p) => Boolean(defendingChampion && (
    (p.profileId && defendingChampion.profileId === p.profileId) ||
    (!p.profileId && !defendingChampion.profileId && defendingChampion.name?.toLowerCase() === p.name?.toLowerCase())
  ));

  const roundStandingRows = useMemo(() => {
    const currentSorted = [...players].sort((a,b) => b.score - a.score);
    const beforeSorted = [...players].sort((a,b) => {
      const ak = a.profileId || a.name, bk = b.profileId || b.name;
      return (roundStartScores[bk] ?? 0) - (roundStartScores[ak] ?? 0);
    });
    return currentSorted.map((p, i) => {
      const oldIndex = beforeSorted.findIndex(x => (x.profileId || x.name) === (p.profileId || p.name));
      return { p, rank: i + 1, move: oldIndex - i };
    });
  }, [players, roundStartScores]);

  return (
    <div className={`app ${screen === "game" ? "app-game" : ""}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600;700&display=swap');

        :root {
          --bg: #06121d;
          --bg-2: #091a29;
          --panel: #0b1c2a;
          --panel-2: #102638;
          --line: #22384a;
          --text: #f5f8fb;
          --muted: #8ea1b2;
          --lime: #8cf000;
          --lime-2: #b0ff36;
          --red: #ff3b3b;
          --cyan: #17c8ff;
        }

        * { box-sizing: border-box; }
        body { margin: 0; background: var(--bg); }
        button, input { font: inherit; }
        button { -webkit-tap-highlight-color: transparent; }

        .app {
          min-height: 100vh;
          max-width: 560px;
          margin: 0 auto;
          padding: 16px 14px 36px;
          color: var(--text);
          font-family: 'Inter', sans-serif;
          background:
            radial-gradient(circle at top right, rgba(23,200,255,.08), transparent 34%),
            linear-gradient(180deg, #071522 0%, #04101a 100%);
        }

        h1, h2, h3, .sport { font-family: 'Oswald', sans-serif; text-transform: uppercase; }
        .nav { display:flex; align-items:center; justify-content:space-between; padding: 4px 0 14px; border-bottom:1px solid var(--line); margin-bottom:18px; }
        .brand { display:flex; align-items:center; gap:9px; cursor:pointer; }
        .brand-app-icon { width:34px; height:34px; border-radius:9px; object-fit:cover; box-shadow:0 0 12px rgba(140,240,0,.14); }
        .brand h1 { margin:0; font-size:20px; font-style:italic; letter-spacing:.035em; }
        .nav-btns { display:flex; gap:7px; }
        .icon-btn { width:38px; height:38px; border-radius:10px; border:1px solid var(--line); background:rgba(255,255,255,.025); color:var(--text); display:grid; place-items:center; cursor:pointer; }
        .icon-btn:hover { border-color:var(--lime); color:var(--lime); }
        .menu-trigger {
          width:44px; height:44px; border-radius:11px;
          border-color:#3b566c;
          background:linear-gradient(180deg,rgba(22,42,57,.96),rgba(8,23,34,.98));
          box-shadow:0 4px 13px rgba(0,0,0,.24);
        }
        .menu-trigger:hover { border-color:#5f7f97; color:var(--text); }

        .notice { display:flex; gap:8px; align-items:flex-start; padding:10px 12px; border:1px solid rgba(255,59,59,.7); background:rgba(255,59,59,.09); border-radius:10px; font-size:12px; margin-bottom:14px; }
        .hero { text-align:center; padding:10px 0 18px; }
        .home-banner { display:block; width:100%; height:auto; border-radius:14px; border:1px solid var(--line); box-shadow:0 12px 28px rgba(0,0,0,.24); }
        .hero-icon { color:var(--lime); margin-bottom:12px; }
        .hero h1 { margin:0; font-size:54px; font-style:italic; line-height:1; }
        .hero h1 span { color:var(--lime); }
        .hero p { margin:12px auto 0; color:var(--muted); max-width:390px; line-height:1.55; font-size:14px; }

        .btn-stack { display:flex; flex-direction:column; gap:10px; margin-top:18px; }
        .btn { border:0; border-radius:12px; min-height:52px; padding:12px 18px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; font-family:'Oswald',sans-serif; font-weight:700; text-transform:uppercase; letter-spacing:.045em; font-size:16px; }
        .btn:active { transform:scale(.985); }
        .btn:disabled { opacity:.35; cursor:not-allowed; }
        .btn-lime { background:linear-gradient(180deg,var(--lime-2),var(--lime)); color:#06121d; box-shadow:0 0 22px rgba(140,240,0,.15); }
        .btn-outline { background:rgba(255,255,255,.02); border:1px solid var(--line); color:var(--text); }
        .btn-red { background:transparent; border:2px solid var(--red); color:var(--red); }
        .btn-cyan { background:transparent; border:1px solid var(--cyan); color:var(--cyan); }

        .section-title { font-family:'Oswald',sans-serif; text-transform:uppercase; letter-spacing:.075em; font-size:13px; color:var(--lime); margin:4px 0 12px; display:flex; align-items:center; gap:7px; }
        .panel { border:1px solid var(--line); background:rgba(11,28,42,.86); border-radius:14px; padding:16px; }
        .panel + .panel { margin-top:12px; }
        .muted { color:var(--muted); }
        .small { font-size:12px; }

        .mode-badge { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--line); color:var(--muted); padding:6px 9px; border-radius:999px; font-size:11px; text-transform:uppercase; letter-spacing:.06em; margin-bottom:12px; }
        .setup-heading { margin:0 0 6px; font-size:25px; }
        .row { display:flex; gap:9px; }
        .text-input { flex:1; min-width:0; background:#07131e; border:1px solid var(--line); color:var(--text); border-radius:10px; padding:13px 14px; outline:none; }
        .text-input:focus { border-color:var(--lime); }
        .add-btn { width:48px; border:0; border-radius:10px; background:var(--lime); color:#06121d; display:grid; place-items:center; cursor:pointer; }
        .player-chip { margin-top:8px; border:1px solid var(--line); background:#07131e; border-radius:10px; padding:11px 12px; display:flex; align-items:center; justify-content:space-between; font-family:'IBM Plex Mono',monospace; }
        .player-chip button { border:0; background:transparent; color:var(--muted); cursor:pointer; }

        .round-top { display:flex; justify-content:space-between; align-items:center; gap:14px; padding:8px 2px 14px; border-bottom:1px solid var(--line); }
        .round-name { margin:0; font-size:48px; font-style:italic; line-height:1; }
        .round-rule { margin:7px 0 0; color:var(--muted); font-size:12px; max-width:250px; line-height:1.35; }
        .ring-seg-done { fill:#2a3d4d; }
        .ring-seg-current { fill:var(--lime); }
        .ring-seg-upcoming { fill:rgba(255,255,255,.055); }
        .ring-num { font-family:'IBM Plex Mono',monospace; font-size:20px; fill:var(--text); font-weight:700; }
        .ring-total { font-family:'Inter',sans-serif; font-size:8px; fill:var(--text); font-weight:700; }

        .now-card { margin-top:16px; text-align:center; position:relative; border:1px solid var(--lime); background:linear-gradient(180deg,rgba(16,38,56,.96),rgba(6,18,29,.96)); padding:20px 16px; clip-path:polygon(14px 0,calc(100% - 14px) 0,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0 calc(100% - 14px),0 14px); box-shadow:0 0 24px rgba(140,240,0,.06); }
        .now-label { color:var(--text); font-family:'Oswald',sans-serif; font-weight:600; font-style:italic; font-size:16px; text-transform:uppercase; }
        .now-row { display:flex; align-items:baseline; justify-content:center; gap:15px; margin-top:6px; }
        .now-name { font-family:'Oswald',sans-serif; font-size:37px; font-weight:700; font-style:italic; text-transform:uppercase; }
        .now-score { font-family:'Oswald',sans-serif; font-size:82px; line-height:.95; font-weight:700; font-style:italic; color:var(--lime); }
        .now-card.flash-score { background:rgba(140,240,0,.12); }
        .now-card.flash-half { background:rgba(255,59,59,.13); border-color:var(--red); }

        .up-next { margin-top:10px; border:1px solid var(--line); border-radius:11px; padding:11px 14px; display:flex; justify-content:center; gap:10px; font-family:'Oswald',sans-serif; text-transform:uppercase; font-weight:600; }
        .up-next span:first-child { color:var(--muted); }
        .up-next strong { color:var(--lime); }

        .mini-standings { display:flex; gap:7px; overflow-x:auto; padding:12px 0 2px; }
        .mini-score { min-width:92px; border:1px solid var(--line); background:rgba(255,255,255,.02); border-radius:10px; padding:8px 9px; }
        .mini-score.active { border-color:var(--lime); }
        .mini-score .n { font-size:10px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .mini-score .s { font-family:'IBM Plex Mono',monospace; font-size:18px; font-weight:700; margin-top:2px; }

        .score-display { margin-top:16px; min-height:60px; border:1px solid var(--line); border-radius:12px; background:#07131e; display:flex; align-items:center; justify-content:center; font-family:'IBM Plex Mono',monospace; font-size:28px; font-weight:700; color:var(--text); }
        .score-display.empty { color:#546676; font-size:15px; font-family:'Inter',sans-serif; font-weight:500; }
        .score-conversion { min-height:20px; margin-top:7px; text-align:center; color:var(--lime); font-family:'IBM Plex Mono',monospace; font-size:13px; font-weight:600; }
        .fixed-score-panel { margin-top:16px; border:1px solid var(--line); border-radius:12px; padding:14px; background:#07131e; text-align:center; }
        .fixed-score-copy { color:var(--muted); font-size:12px; margin-bottom:10px; }
        .fixed-score-btn { width:100%; min-height:62px; border-radius:11px; border:1px solid var(--lime); background:linear-gradient(180deg,var(--lime-2),var(--lime)); color:#06121d; font-family:'Oswald',sans-serif; font-size:19px; font-weight:700; text-transform:uppercase; cursor:pointer; }

        .desktop-game-columns,
        .desktop-player-column,
        .desktop-score-column { display:contents; }
        .desktop-key-hint { display:none; }
        .dart-entry { margin-top:10px; }
        .dart-entry-title { text-align:center; font-family:'Oswald',sans-serif; text-transform:uppercase; font-size:12px; letter-spacing:.08em; color:var(--muted); }
        .dart-slots { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:7px 0 9px; }
        .dart-slot { min-height:54px; border:1px solid var(--line); border-radius:12px; background:#07131e; display:flex; flex-direction:column; align-items:center; justify-content:center; }
        .dart-slot .dart-no { font-size:9px; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; }
        .dart-slot .dart-result { margin-top:3px; font-family:'Oswald',sans-serif; font-size:16px; font-weight:700; text-transform:uppercase; color:var(--text); }
        .dart-slot.filled { border-color:#35536a; }
        .dart-slot.current { border-color:var(--lime); box-shadow:0 0 0 1px rgba(139,255,0,.12) inset; }
        .dart-choice-stack { display:flex; flex-direction:column; gap:7px; }
        .dart-choice {
          width:100%; min-height:56px; border-radius:12px; border:1px solid #31485b;
          background:linear-gradient(180deg,#112536,#0a1926); color:var(--text);
          display:grid; grid-template-columns:1fr auto 1fr; align-items:center;
          padding:0 17px; cursor:pointer;
        }
        .dart-choice strong { grid-column:2; justify-self:center; text-align:center; }
        .dart-choice span { grid-column:3; justify-self:end; }
        .dart-choice:active { transform:scale(.985); border-color:var(--lime); background:#142d3f; }
        .dart-choice strong { font-family:'Oswald',sans-serif; font-size:19px; font-style:italic; text-transform:uppercase; }
        .dart-choice span { font-family:'IBM Plex Mono',monospace; color:var(--lime); font-size:14px; font-weight:700; }
        .dart-choice.miss span { color:var(--muted); }
        .dart-visit-total { margin:6px 0; text-align:center; font-family:'IBM Plex Mono',monospace; color:var(--lime); font-size:15px; font-weight:700; line-height:1.2; }
        .dart-actions { display:grid; grid-template-columns:auto 1fr; gap:8px; margin-top:7px; }
        .undo-dart { min-width:104px; border:1px solid var(--line); border-radius:11px; background:transparent; color:var(--muted); font-family:'Oswald',sans-serif; text-transform:uppercase; font-weight:600; cursor:pointer; }
        .add-visit { min-height:56px; border:1px solid var(--lime); border-radius:11px; background:linear-gradient(180deg,var(--lime-2),var(--lime)); color:#06121d; font-family:'Oswald',sans-serif; font-size:18px; font-weight:700; text-transform:uppercase; cursor:pointer; }
        .add-visit:disabled, .undo-dart:disabled { opacity:.35; cursor:not-allowed; }

        .keypad { display:grid; grid-template-columns:repeat(3,1fr); gap:11px; margin-top:13px; }
        .key {
          min-height:70px;
          border-radius:20px;
          border:1px solid #3b5569;
          background:linear-gradient(180deg,#142b3d,#0a1926);
          color:var(--text);
          font-family:'IBM Plex Mono',monospace;
          font-size:25px;
          font-weight:700;
          cursor:pointer;
          box-shadow:0 5px 12px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.025);
          transition:transform .1s ease, border-color .12s ease, background .12s ease, box-shadow .12s ease;
        }
        .key:active {
          transform:scale(.97);
          border-color:var(--lime);
          background:linear-gradient(180deg,#1b384d,#0e2231);
          box-shadow:0 0 15px rgba(139,255,0,.14), inset 0 1px 0 rgba(255,255,255,.035);
        }
        .key:active { transform:scale(.97); border-color:var(--lime); }
        .key-enter {
          background:linear-gradient(180deg,var(--lime-2),var(--lime));
          color:#06121d;
          border-color:var(--lime);
          font-family:'Oswald',sans-serif;
          font-size:18px;
          border-radius:20px;
          min-height:68px;
        }
        .key-clear {
          color:#ff9f92;
          border-color:#6b3438;
          background:linear-gradient(180deg,#2a171c,#1c1115);
          font-family:'Oswald',sans-serif;
          font-size:16px;
          border-radius:20px;
        }
        @keyframes halfDangerPulse {
          0%, 100% { box-shadow:0 0 14px rgba(255,74,83,.14), inset 0 0 18px rgba(255,74,83,.025); }
          50% { box-shadow:0 0 24px rgba(255,74,83,.26), inset 0 0 22px rgba(255,74,83,.055); }
        }
        .half-btn {
          width:100%; margin-top:8px; min-height:62px; border-radius:15px;
          border:1px solid #ff4f59;
          background:linear-gradient(180deg,rgba(69,22,28,.97),rgba(27,10,14,.99));
          color:var(--text); font-family:'Oswald',sans-serif; font-weight:700; font-style:italic;
          text-transform:uppercase; cursor:pointer; display:grid; grid-template-columns:54px 1fr auto;
          align-items:center; padding:0 17px 0 6px; overflow:hidden;
          animation:halfDangerPulse 2.6s ease-in-out infinite;
          transition:transform .12s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease;
        }
        .half-btn:hover { border-color:#ff6971; background:linear-gradient(180deg,rgba(82,25,32,.98),rgba(31,11,15,.99)); }
        .half-btn:active {
          transform:scale(.982);
          animation:none;
          background:linear-gradient(180deg,#7a202a,#3b0d14);
          box-shadow:0 0 34px rgba(255,74,83,.58), inset 0 0 26px rgba(255,74,83,.18);
        }
        .half-icon {
          height:50px; border-radius:12px; display:grid; place-items:center;
          color:#ff5964; background:rgba(255,74,83,.10);
          border:1px solid rgba(255,106,115,.20);
        }
        .half-board-icon { width:36px; height:36px; display:block; overflow:visible; filter:drop-shadow(0 0 5px rgba(255,74,83,.28)); }
        .half-label { justify-self:start; padding-left:12px; font-size:23px; letter-spacing:.05em; }
        .half-score { justify-self:end; color:#ff747c; font-family:'IBM Plex Mono',monospace; font-size:16px; font-style:normal; font-weight:700; }

        .results-list { display:flex; flex-direction:column; gap:8px; margin:16px 0; }
        .result-row { flex-wrap:wrap; border:1px solid var(--line); border-radius:11px; padding:12px 14px; display:flex; align-items:center; gap:12px; background:rgba(255,255,255,.02); }
        .result-row.winner { border-color:var(--lime); }
        .rank { width:24px; color:var(--muted); font-family:'IBM Plex Mono',monospace; }
        .result-name { flex:1; }
        .score { font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:20px; }

        .stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:12px 0 14px; }
        .stat { border:1px solid var(--line); background:#07131e; border-radius:11px; padding:12px 8px; text-align:center; }
        .stat .num { font-family:'IBM Plex Mono',monospace; color:var(--lime); font-weight:700; font-size:22px; }
        .stat .label { color:var(--muted); font-size:9px; text-transform:uppercase; letter-spacing:.07em; margin-top:3px; }
        .lb-row { display:grid; grid-template-columns:30px 1fr auto auto; gap:8px; align-items:center; padding:11px 2px; border-bottom:1px solid var(--line); font-size:13px; }
        .lb-row:last-child { border-bottom:0; }
        .lb-rank { color:var(--lime); font-family:'IBM Plex Mono',monospace; font-size:12px; }
        .lb-date { color:var(--muted); font-size:10px; }
        .lb-score { font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:17px; }
        .empty-note { text-align:center; color:var(--muted); font-size:13px; padding:24px 8px; }
        .install-panel { display:flex; align-items:center; gap:14px; justify-content:space-between; }
        .install-panel > div { flex:1; }
        .install-btn { width:auto; min-width:112px; padding-left:16px; padding-right:16px; }
        .resume-panel { border-color:var(--lime); margin-bottom:14px; padding:13px 15px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .resume-copy { min-width:0; flex:1; }
        .resume-title { color:var(--lime); margin-bottom:2px; }
        .resume-round { font-family:'Oswald',sans-serif; font-size:19px; line-height:1.1; margin-bottom:3px; }
        .resume-btn { width:auto; min-width:142px; min-height:46px; padding:9px 14px; flex:0 0 auto; font-size:14px; }
        @media (max-width: 430px) {
          .install-panel { align-items:stretch; flex-direction:column; }
          .install-btn { width:100%; }
          .resume-panel { padding:11px 12px; gap:9px; }
          .resume-round { font-size:17px; }
          .resume-btn { min-width:124px; min-height:42px; padding:8px 10px; font-size:13px; }
        }
        @media (max-width: 340px) {
          .resume-panel { flex-wrap:wrap; }
          .resume-btn { width:100%; }
        }
        .shared-note { text-align:center; color:var(--muted); font-size:11px; margin-top:12px; line-height:1.45; }
        .up-next-score { margin-left:auto; color:var(--text); font-family:'IBM Plex Mono',monospace; font-weight:700; }
        .all-scores { margin-top:8px; border:1px solid var(--line); border-radius:10px; background:rgba(255,255,255,.015); }
        .all-scores summary { cursor:pointer; padding:8px 11px; color:var(--muted); font-size:11px; text-align:center; list-style:none; }
        .all-scores summary::-webkit-details-marker { display:none; }
        .all-scores[open] summary { border-bottom:1px solid var(--line); color:var(--lime); }
        .all-scores .mini-standings { padding:8px; }

        .score-pop { position:absolute; right:18px; top:50%; transform:translateY(-50%); font-family:'Oswald',sans-serif; font-size:30px; font-weight:700; color:var(--lime); animation:scorePop .55s ease-out both; }
        .score-pop.half { color:var(--red); font-size:24px; }
        @keyframes scorePop { 0%{opacity:0;transform:translateY(-30%) scale(.7)} 35%{opacity:1;transform:translateY(-55%) scale(1.15)} 100%{opacity:0;transform:translateY(-90%) scale(1)} }
        .undo-row { display:flex; justify-content:center; margin-top:7px; }
        .undo-btn { border:0; background:transparent; color:var(--muted); padding:7px 12px; cursor:pointer; font-size:12px; display:flex; gap:6px; align-items:center; }
        .round-overlay { position:fixed; inset:0; z-index:50; background:rgba(3,11,18,.94); display:grid; place-items:center; text-align:center; }
        .round-overlay .big { font-family:'Oswald',sans-serif; font-size:56px; color:var(--lime); text-transform:uppercase; font-style:italic; }
        .round-overlay .smallx { color:var(--muted); text-transform:uppercase; letter-spacing:.14em; font-size:13px; }
        .summary { margin-top:12px; padding:14px; border:1px solid var(--line); border-radius:13px; background:var(--panel); }
        .summary h3 { margin:0 0 10px; color:var(--lime); text-align:center; }
        .summary-row { display:flex; justify-content:space-between; padding:8px 4px; border-bottom:1px solid var(--line); }
        .summary-row:last-of-type { border-bottom:0; }
        .menu-wrap { position:relative; }
        .game-menu { position:absolute; right:0; top:42px; z-index:20; min-width:180px; border:1px solid var(--line); background:#07131e; border-radius:10px; padding:7px; box-shadow:0 14px 35px rgba(0,0,0,.4); }
        .game-menu button { width:100%; padding:10px; border:0; background:transparent; color:var(--text); text-align:left; cursor:pointer; }
        .game-menu .danger { color:var(--red); }
        .admin-login-card { max-width:420px; margin:24px auto 0; }
        .admin-login-card .shield-mark { width:64px; height:64px; margin:0 auto 14px; border:1px solid rgba(140,240,0,.55); border-radius:18px; display:grid; place-items:center; color:var(--lime); background:rgba(140,240,0,.06); }
        .admin-tabs { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; margin:14px 0; }
        .admin-tabs button { min-height:42px; border:1px solid var(--line); border-radius:10px; background:#07131e; color:var(--muted); font-family:'Oswald',sans-serif; text-transform:uppercase; font-weight:700; cursor:pointer; }
        .admin-tabs button.active { color:#06121d; background:var(--lime); border-color:var(--lime); }
        .admin-game { border:1px solid var(--line); border-radius:13px; background:rgba(11,28,42,.9); margin-bottom:12px; overflow:hidden; }
        .admin-game-head { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 13px; border-bottom:1px solid var(--line); }
        .admin-game-head strong { font-family:'Oswald',sans-serif; text-transform:uppercase; letter-spacing:.04em; }
        .admin-player-row { display:grid; grid-template-columns:1fr auto auto; gap:8px; align-items:center; padding:10px 13px; border-bottom:1px solid rgba(34,56,74,.55); }
        .admin-player-row:last-child { border-bottom:0; }
        .admin-player-score { font-family:'IBM Plex Mono',monospace; font-size:18px; font-weight:700; }
        .admin-actions { display:flex; gap:6px; }
        .admin-mini { border:1px solid var(--line); background:#07131e; color:var(--text); border-radius:8px; min-width:34px; height:34px; display:grid; place-items:center; cursor:pointer; }
        .admin-mini.danger { color:var(--red); border-color:rgba(255,59,59,.45); }
        .admin-profile { display:flex; gap:10px; align-items:center; padding:11px 0; border-bottom:1px solid var(--line); }
        .admin-profile:last-child { border-bottom:0; }
        .admin-profile-copy { flex:1; min-width:0; }
        .admin-profile-copy strong { display:block; }
        .admin-profile-actions { display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
        .admin-chip { border:1px solid var(--line); border-radius:8px; background:#07131e; color:var(--text); padding:7px 9px; font-size:11px; cursor:pointer; }
        .admin-chip.danger { color:var(--red); border-color:rgba(255,59,59,.45); }
        .audit-row { padding:10px 0; border-bottom:1px solid var(--line); }
        .audit-row:last-child { border-bottom:0; }
        .audit-action { font-family:'Oswald',sans-serif; text-transform:uppercase; color:var(--lime); font-size:13px; }
        .audit-details { color:var(--muted); font-size:11px; margin-top:3px; overflow-wrap:anywhere; }
        .filter-tabs { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-bottom:14px; }
        .filter-tab { padding:9px 5px; border-radius:9px; border:1px solid var(--line); background:transparent; color:var(--muted); font-size:11px; cursor:pointer; }
        .filter-tab.active { border-color:var(--lime); color:var(--lime); background:rgba(140,240,0,.06); }
        .medal { width:30px; height:30px; display:grid; place-items:center; border-radius:50%; background:rgba(140,240,0,.09); font-weight:700; }
        .pb-badge { margin-left:7px; color:var(--lime); font-size:10px; text-transform:uppercase; font-weight:700; }
        .record-banner { border:1px solid var(--lime); background:rgba(140,240,0,.08); border-radius:13px; padding:13px; text-align:center; margin-bottom:12px; color:var(--lime); font-family:'Oswald',sans-serif; text-transform:uppercase; font-size:18px; }
        .profile-grid { display:grid; gap:8px; }
        .profile-pick, .profile-row { width:100%; border:1px solid var(--line); background:rgba(255,255,255,.025); color:var(--text); border-radius:12px; padding:10px 12px; display:flex; align-items:center; gap:11px; text-align:left; cursor:pointer; }
        .profile-pick.selected { border-color:var(--lime); background:rgba(140,240,0,.07); }
        .profile-pick:disabled { opacity:.4; cursor:not-allowed; }
        .profile-avatar { width:42px; height:42px; flex:0 0 42px; display:grid; place-items:center; border-radius:50%; border:2px solid currentColor; font-family:'Oswald',sans-serif; font-weight:700; font-size:18px; color:var(--lime); background:#07131e; }
        .profile-avatar.large { width:52px; height:52px; flex-basis:52px; font-size:21px; }
        .profile-avatar.hero-avatar { width:72px; height:72px; flex-basis:72px; font-size:29px; box-shadow:0 0 26px rgba(140,240,0,.08); }
        .profile-pick-copy, .profile-row-copy { flex:1; min-width:0; display:flex; flex-direction:column; }
        .profile-pick-copy strong, .profile-row-copy strong { font-size:14px; }
        .profile-pick-copy small, .profile-row-copy small, .profile-preview small, .profile-stats-head small { color:var(--muted); margin-top:2px; font-size:11px; }
        .profile-check { color:var(--lime); font-size:20px; font-weight:700; }
        .profile-create-inline { margin-top:10px; min-height:46px; }

        .round-strip { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; margin:-2px 0 10px; padding:2px 1px 5px; }
        .round-strip::-webkit-scrollbar { display:none; }
        .round-pill { flex:0 0 auto; min-width:34px; height:28px; padding:0 8px; border-radius:999px; border:1px solid var(--line); display:flex; align-items:center; justify-content:center; font-family:'IBM Plex Mono',monospace; font-size:10px; color:var(--muted); background:rgba(255,255,255,.025); }
        .round-pill.done { color:#779086; border-color:#2f4940; opacity:.72; }
        .round-pill.current { color:#07120d; background:var(--lime); border-color:var(--lime); font-weight:800; box-shadow:0 0 14px rgba(136,255,59,.24); }
        .summary-next { margin:14px 0 4px; padding:12px; border:1px solid rgba(136,255,59,.25); border-radius:12px; background:rgba(136,255,59,.055); text-align:center; }
        .summary-next .label { color:var(--muted); font-size:10px; text-transform:uppercase; letter-spacing:.1em; }
        .summary-next .target { color:var(--lime); font-family:'Oswald',sans-serif; font-size:30px; font-weight:700; text-transform:uppercase; margin-top:2px; }
        .move { display:inline-block; min-width:22px; margin-left:7px; font-size:12px; font-weight:800; }
        .move.up { color:var(--lime); } .move.down { color:var(--red); } .move.same { color:var(--muted); }
        .setup-tools { display:flex; justify-content:flex-end; margin:-2px 0 8px; }
        .random-btn { border:1px solid var(--line); color:var(--cyan); background:transparent; border-radius:9px; padding:7px 10px; font-size:11px; font-weight:700; cursor:pointer; }
        .throw-order-note { color:var(--muted); font-size:11px; margin:-2px 0 8px; }
        .player-chip.order-row { gap:8px; transition:border-color .12s, transform .12s, background .12s; }
        .player-chip.order-row.drag-over { border-color:var(--lime); background:rgba(130,255,120,.08); }
        .player-chip.order-row.dragging { opacity:.6; transform:scale(.985); }
        .drag-handle {
          flex:0 0 36px; width:36px; height:34px; border:1px solid var(--line); border-radius:8px;
          display:flex; align-items:center; justify-content:center; color:var(--muted); background:rgba(255,255,255,.025);
          font-size:18px; letter-spacing:-3px; cursor:grab; user-select:none; touch-action:none;
        }
        .drag-handle:active { cursor:grabbing; border-color:var(--lime); color:var(--lime); }
        .order-player-copy { flex:1; min-width:0; }
        .champ-crown { margin-left:6px; font-size:14px; }
        .result-meta { width:100%; padding-left:34px; display:flex; gap:12px; color:var(--muted); font-size:10px; margin-top:3px; }
        .rematch-note { color:var(--muted); font-size:11px; text-align:center; margin-top:-2px; }
        .guest-divider { display:flex; align-items:center; gap:10px; color:var(--muted); font-size:10px; text-transform:uppercase; letter-spacing:.08em; margin:17px 0 10px; }
        .guest-divider:before,.guest-divider:after { content:''; height:1px; background:var(--line); flex:1; }
        .player-chip em { font-style:normal; color:var(--muted); font-size:9px; text-transform:uppercase; margin-left:6px; border:1px solid var(--line); border-radius:999px; padding:2px 5px; }
        .players-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:14px; }
        .profile-list { display:grid; gap:8px; margin-top:14px; }
        .profile-row:hover { border-color:var(--lime); }
        .guest-info { margin-top:14px; display:flex; gap:12px; align-items:flex-start; }
        .profile-preview { margin:18px 0; padding:18px; border:1px solid var(--line); border-radius:14px; background:linear-gradient(135deg,rgba(140,240,0,.05),rgba(23,200,255,.04)); display:flex; align-items:center; gap:14px; }
        .profile-preview strong { display:block; font-family:'Oswald',sans-serif; font-size:25px; text-transform:uppercase; }
        .form-label { display:block; color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.07em; margin:14px 0 6px; }
        .form-label span { text-transform:none; letter-spacing:0; }
        .text-input.full { width:100%; }
        .avatar-options { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; }
        .avatar-choice { height:52px; border:1px solid var(--line); border-radius:11px; background:#07131e; color:var(--text); font-size:22px; cursor:pointer; }
        .avatar-choice.active { border-color:var(--lime); box-shadow:inset 0 0 0 1px var(--lime); }
        .accent-options { display:flex; gap:10px; }
        .accent-choice { width:34px; height:34px; border-radius:50%; border:3px solid transparent; cursor:pointer; background:currentColor; }
        .accent-choice.active { outline:2px solid var(--text); outline-offset:2px; }
        .accent-lime { color:#8cf000; }
        .accent-cyan { color:#17c8ff; }
        .accent-purple { color:#a87cff; }
        .accent-orange { color:#ff9a3d; }
        .accent-pink { color:#ff63ad; }
        .accent-slate { color:#8ea1b2; }
        .profile-stats-head { display:flex; align-items:center; gap:11px; padding:12px; border:1px solid var(--line); border-radius:12px; margin-bottom:12px; }
        .profile-stats-head > div { flex:1; display:flex; flex-direction:column; }
        .profile-stats-head strong { font-family:'Oswald',sans-serif; font-size:21px; text-transform:uppercase; }
        .leaderboard-tabs { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-bottom:14px; }
        .leaderboard-tabs button { background:var(--panel); border:1px solid var(--line); color:var(--muted); border-radius:9px; padding:10px 6px; font-family:'Oswald',sans-serif; text-transform:uppercase; letter-spacing:.04em; cursor:pointer; }
        .leaderboard-tabs button.active { border-color:var(--lime); color:var(--lime); background:rgba(140,240,0,.08); }
        .leader-player-row { width:100%; background:none; color:inherit; border:0; text-align:left; cursor:pointer; }
        .leader-player-grid { display:grid; grid-template-columns:34px 1fr auto; gap:10px; align-items:center; padding:12px 2px; border-bottom:1px solid var(--line); }
        .leader-player-grid:last-child { border-bottom:0; }
        .leader-player-meta { display:flex; flex-direction:column; min-width:0; }
        .leader-player-meta strong { font-size:14px; }
        .leader-player-meta small { color:var(--muted); font-size:10px; margin-top:2px; }
        .leader-player-best { text-align:right; font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:18px; }
        .record-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
        .record-card { background:var(--bg-2); border:1px solid var(--line); border-radius:12px; padding:13px; min-height:96px; }
        .record-card .record-icon { font-size:21px; }
        .record-card .record-label { color:var(--muted); font-size:9px; text-transform:uppercase; letter-spacing:.08em; margin-top:6px; }
        .record-card .record-value { font-family:'IBM Plex Mono',monospace; color:var(--lime); font-size:20px; font-weight:700; margin-top:2px; }
        .record-card .record-name { font-size:12px; margin-top:2px; }
        .profile-hero-card { border:1px solid var(--line); border-radius:15px; padding:15px; background:linear-gradient(145deg,var(--panel),var(--panel-2)); margin-bottom:12px; }
        .profile-hero-top { display:flex; align-items:center; gap:12px; }
        .profile-hero-copy { flex:1; min-width:0; }
        .profile-hero-copy h2 { font-size:25px; margin:0; }
        .profile-hero-copy p { margin:2px 0 0; color:var(--muted); font-size:11px; }
        .pb-hero { text-align:center; margin:16px 0 8px; }
        .pb-hero .label { color:var(--muted); font-size:9px; text-transform:uppercase; letter-spacing:.12em; }
        .pb-hero .value { font-family:'IBM Plex Mono',monospace; font-size:42px; color:var(--lime); font-weight:700; line-height:1.05; }
        .stats-grid.four { grid-template-columns:repeat(4,1fr); }
        .stats-grid.four .stat .num { font-size:19px; }
        .form-card { background:var(--panel); border:1px solid var(--line); border-radius:13px; padding:13px; margin-bottom:12px; }
        .form-head { display:flex; justify-content:space-between; align-items:end; gap:10px; margin-bottom:8px; }
        .form-head strong { font-family:'Oswald',sans-serif; text-transform:uppercase; }
        .trend { font-family:'IBM Plex Mono',monospace; font-size:12px; }
        .trend.up { color:var(--lime); } .trend.down { color:var(--red); } .trend.flat { color:var(--muted); }
        .score-chart-wrap { width:100%; overflow:hidden; }
        .score-chart { width:100%; height:128px; display:block; }
        .chart-axis { stroke:var(--line); stroke-width:1; }
        .chart-line { fill:none; stroke:var(--lime); stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; }
        .chart-dot { fill:var(--bg); stroke:var(--lime); stroke-width:2; }
        .chart-label { fill:var(--muted); font:8px 'IBM Plex Mono',monospace; }
        .chart-empty { color:var(--muted); text-align:center; font-size:11px; padding:26px 4px; }
        .achievement-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
        .achievement { background:var(--bg-2); border:1px solid var(--line); border-radius:11px; padding:11px; min-height:86px; }
        .achievement .icon { font-size:20px; }
        .achievement strong { display:block; font-size:12px; margin-top:5px; }
        .achievement small { display:block; color:var(--muted); font-size:9px; margin-top:2px; line-height:1.3; }
        .recent-row { display:grid; grid-template-columns:1fr auto auto; gap:8px; align-items:center; padding:10px 0; border-bottom:1px solid var(--line); }
        .recent-row:last-child { border-bottom:0; }
        .recent-mode { font-size:11px; }
        .recent-date { color:var(--muted); font-size:10px; }
        .recent-score { font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:16px; }

        .mini-link { border:0; background:transparent; color:var(--cyan); cursor:pointer; font-size:11px; }
        .profile-quick-select { display:flex; gap:7px; overflow-x:auto; padding:1px 0 10px; }
        .profile-quick-select button { flex:0 0 auto; display:flex; align-items:center; gap:6px; border:1px solid var(--line); background:#07131e; color:var(--text); border-radius:999px; padding:5px 9px 5px 5px; cursor:pointer; font-size:11px; }
        .tiny-avatar { width:25px; height:25px; border-radius:50%; border:1px solid currentColor; display:grid; place-items:center; font-size:11px; }
        .wins-strip { margin:-3px 0 14px; display:flex; align-items:center; justify-content:center; gap:6px; color:var(--muted); font-size:11px; }
        .wins-strip strong { color:var(--lime); }
        /* Compact game layout so the scoring controls fit typical Android screens without scrolling. */
        .app-game { padding-top:8px; padding-bottom:max(10px, env(safe-area-inset-bottom)); min-height:100dvh; }
        .app-game .nav { margin-bottom:7px; padding-bottom:7px; }
        .app-game .brand h1 { font-size:17px; }
        .app-game .icon-btn { width:32px; height:32px; border-radius:8px; }
        .app-game .menu-trigger { width:40px; height:40px; border-radius:10px; }
        .app-game .round-top { padding:2px 1px 7px; gap:8px; }
        .app-game .round-name { font-size:36px; }
        .app-game .round-rule { margin-top:3px; font-size:10.5px; line-height:1.2; max-width:235px; }
        .app-game .round-ring { width:68px; height:68px; }
        .app-game .now-card { margin-top:8px; padding:9px 11px; clip-path:none; border-radius:11px; }
        .app-game .now-label { font-size:11px; }
        .app-game .now-row { margin-top:0; gap:10px; }
        .app-game .now-name { font-size:27px; }
        .app-game .now-score { font-size:50px; }
        .app-game .up-next { margin-top:6px; padding:6px 10px; font-size:12px; justify-content:flex-start; }
        .app-game .all-scores { margin-top:5px; }
        .app-game .score-display { margin-top:8px; min-height:42px; border-radius:9px; font-size:22px; }
        .app-game .score-display.empty { font-size:12px; }
        .app-game .score-conversion { min-height:15px; margin-top:3px; font-size:11px; }
        .app-game .fixed-score-panel { margin-top:8px; padding:9px; }
        .app-game .fixed-score-copy { font-size:10px; margin-bottom:6px; }
        .app-game .fixed-score-btn { min-height:46px; font-size:16px; }
        .app-game .keypad { gap:10px; margin-top:9px; }
        .app-game .key { min-height:60px; border-radius:18px; font-size:22px; }
        .app-game .key-enter { min-height:60px; font-size:17px; }
        .app-game .dart-entry { margin-top:7px; }
        .app-game .dart-slots { margin:6px 0 7px; }
        .app-game .dart-choice-stack { gap:6px; }
        .app-game .dart-choice { min-height:52px; border-radius:10px; }
        .app-game .dart-choice strong { font-size:17px; }
        .app-game .dart-actions { margin-top:6px; }
        .app-game .add-visit { min-height:48px; font-size:16px; }
        .app-game .half-btn { margin-top:7px; min-height:60px; border-radius:14px; }
        .app-game .half-icon { height:48px; }
        .app-game .half-board-icon { width:34px; height:34px; }
        .app-game .half-label { font-size:22px; }
        .app-game .half-score { font-size:15px; }

        @media (max-height: 760px) {
          .app-game { padding-left:10px; padding-right:10px; }
          .app-game .nav { margin-bottom:4px; padding-bottom:4px; }
          .app-game .brand h1 { font-size:15px; }
          .app-game .icon-btn { width:29px; height:29px; }
          .app-game .menu-trigger { width:38px; height:38px; }
          .app-game .round-top { padding-bottom:4px; }
          .app-game .round-name { font-size:31px; }
          .app-game .round-rule { font-size:9.5px; max-width:220px; }
          .app-game .round-ring { width:60px; height:60px; }
          .app-game .now-card { margin-top:5px; padding:6px 9px; }
          .app-game .now-label { font-size:10px; }
          .app-game .now-name { font-size:23px; }
          .app-game .now-score { font-size:42px; }
          .app-game .up-next { margin-top:4px; padding:5px 9px; font-size:11px; }
          .app-game .score-display { margin-top:5px; min-height:35px; font-size:19px; }
          .app-game .score-conversion { min-height:12px; margin-top:2px; font-size:10px; }
          .app-game .keypad { gap:8px; margin-top:6px; }
          .app-game .key { min-height:54px; border-radius:16px; font-size:20px; }
          .app-game .key-enter { min-height:54px; font-size:16px; }
          .app-game .dart-entry { margin-top:5px; }
          .app-game .dart-slot { min-height:47px; }
          .app-game .dart-choice { min-height:48px; }
          .app-game .dart-choice strong { font-size:16px; }
          .app-game .dart-actions { margin-top:5px; }
          .app-game .add-visit { min-height:43px; font-size:15px; }
          .app-game .half-btn { margin-top:6px; min-height:55px; }
          .app-game .half-icon { height:43px; }
          .app-game .half-board-icon { width:31px; height:31px; }
          .app-game .half-label { font-size:19px; }
          .app-game .half-score { font-size:13px; }
          .app-game .fixed-score-panel { margin-top:5px; padding:7px; }
          .app-game .fixed-score-btn { min-height:40px; }
          .app-game .all-scores summary { padding:5px 9px; font-size:10px; }
        }

        @media (max-height: 660px) {
          .app-game .nav { display:none; }
          .app-game .round-top { padding-top:0; }
          .app-game .round-name { font-size:28px; }
          .app-game .round-rule { display:none; }
          .app-game .round-ring { width:54px; height:54px; }
          .app-game .now-card { margin-top:4px; }
          .app-game .now-label { display:none; }
          .app-game .now-name { font-size:21px; }
          .app-game .now-score { font-size:38px; }
          .app-game .score-display { min-height:31px; }
          .app-game .key { min-height:48px; border-radius:15px; }
          .app-game .dart-choice { min-height:44px; }
          .app-game .half-btn { min-height:50px; }
          .app-game .half-icon { height:39px; }
          .app-game .half-board-icon { width:28px; height:28px; }
          .app-game .half-label { font-size:17px; }
          .app-game .half-score { font-size:12px; }
        }

        /* Desktop / laptop presentation only.
           Mobile rules and component behavior remain unchanged below 900px. */
        @media (min-width: 900px) {
          .app.app-game {
            max-width:1180px;
            min-height:100vh;
            padding:20px 28px 32px;
          }

          .app-game .nav {
            display:flex;
            margin-bottom:14px;
            padding-bottom:12px;
          }

          .app-game .brand h1 { font-size:20px; }
          .app-game .brand-app-icon { width:38px; height:38px; }
          .app-game .menu-trigger { width:44px; height:44px; }

          .game-screen { width:100%; }

          .app-game .round-strip {
            margin:0 0 12px;
            padding-bottom:4px;
            display:grid;
            grid-template-columns:repeat(15,minmax(0,1fr));
            gap:5px;
            overflow:visible;
          }

          .app-game .round-pill {
            min-width:0;
            text-align:center;
            padding:7px 3px;
            font-size:10px;
            border-radius:8px;
          }

          .app-game .round-top {
            min-height:92px;
            margin-bottom:16px;
            padding:10px 16px;
            border:1px solid var(--line);
            border-radius:14px;
            background:rgba(8,25,37,.54);
            align-items:center;
          }

          .app-game .round-name { font-size:44px; }
          .app-game .round-rule { max-width:none; font-size:12px; }
          .app-game .round-ring { width:78px; height:78px; }

          .desktop-game-columns {
            display:grid;
            grid-template-columns:minmax(340px,.9fr) minmax(460px,1.1fr);
            gap:22px;
            align-items:start;
          }

          .desktop-player-column,
          .desktop-score-column {
            display:block;
            min-width:0;
          }

          .desktop-player-column {
            position:relative;
          }

          .desktop-score-column {
            padding:18px;
            border:1px solid var(--line);
            border-radius:16px;
            background:linear-gradient(180deg,rgba(11,28,42,.86),rgba(6,18,29,.82));
            box-shadow:0 12px 34px rgba(0,0,0,.20);
          }

          .app-game .now-card {
            min-height:270px;
            margin-top:0;
            padding:30px 28px;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            text-align:center;
            border-radius:17px;
            background:
              radial-gradient(circle at 50% 20%, rgba(140,240,0,.08), transparent 44%),
              linear-gradient(180deg,rgba(15,39,55,.96),rgba(7,24,35,.98));
          }

          .app-game .now-label {
            font-size:13px;
            letter-spacing:.12em;
          }

          .app-game .now-row {
            width:100%;
            margin-top:10px;
            display:flex;
            flex-direction:column;
            justify-content:center;
            align-items:center;
            gap:2px;
          }

          .app-game .now-name {
            font-size:42px;
            line-height:1;
          }

          .app-game .now-score {
            font-size:92px;
            line-height:.98;
            margin-top:8px;
            color:var(--lime-2);
            text-shadow:0 0 20px rgba(140,240,0,.12);
          }

          .app-game .up-next {
            margin-top:12px;
            min-height:56px;
            justify-content:center;
            gap:12px;
            font-size:13px;
            border-radius:12px;
          }

          .app-game .up-next strong { font-size:16px; }
          .app-game .up-next-score { font-size:18px; }

          .app-game .all-scores {
            margin-top:12px;
            border-radius:12px;
          }

          .app-game .all-scores > summary {
            padding:9px 12px;
          }

          .app-game .mini-standings {
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:7px;
            overflow:visible;
            padding:9px;
          }

          .app-game .dart-entry {
            margin-top:0;
          }

          .app-game .dart-entry-title {
            font-size:13px;
            color:var(--text);
          }

          .desktop-key-hint {
            display:block;
            margin:7px 0 12px;
            text-align:center;
            color:var(--muted);
            font-size:11px;
            line-height:1.5;
          }

          .desktop-key-hint b {
            display:inline-block;
            min-width:22px;
            padding:1px 5px;
            margin:0 1px;
            border:1px solid #365064;
            border-bottom-width:2px;
            border-radius:5px;
            color:var(--text);
            background:#0c2131;
            font-family:'IBM Plex Mono',monospace;
            font-size:10px;
          }

          .keypad-hint { margin-top:0; }

          .app-game .dart-slots {
            margin:10px 0 12px;
            gap:10px;
          }

          .app-game .dart-slot {
            min-height:72px;
            border-radius:12px;
          }

          .app-game .dart-choice-stack {
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:10px;
          }

          .app-game .dart-choice {
            min-height:68px;
            border-radius:13px;
            padding:0 20px;
          }

          .app-game .dart-choice strong { font-size:19px; }
          .app-game .dart-choice span { font-size:16px; }

          .app-game .dart-actions {
            margin-top:12px;
            grid-template-columns:160px 1fr;
            gap:10px;
          }

          .app-game .undo-dart,
          .app-game .add-visit {
            min-height:58px;
          }

          .app-game .score-display {
            margin-top:0;
            min-height:66px;
            font-size:30px;
          }

          .app-game .score-conversion {
            min-height:22px;
            margin-top:6px;
            font-size:13px;
          }

          .app-game .keypad {
            gap:11px;
            margin-top:10px;
          }

          .app-game .key {
            min-height:70px;
            border-radius:18px;
            font-size:24px;
          }

          .app-game .key-enter {
            min-height:70px;
            font-size:18px;
          }

          .app-game .fixed-score-panel {
            margin-top:0;
            padding:22px;
          }

          .app-game .fixed-score-copy {
            font-size:13px;
            margin-bottom:14px;
          }

          .app-game .fixed-score-btn {
            min-height:72px;
            font-size:20px;
          }

          .app-game .half-btn {
            min-height:72px;
            margin-top:14px;
            grid-template-columns:60px 1fr auto;
            padding-right:20px;
            border-radius:15px;
          }

          .app-game .half-icon { height:56px; }
          .app-game .half-board-icon { width:39px; height:39px; }
          .app-game .half-label { font-size:25px; }
          .app-game .half-score { font-size:17px; }

          .app-game .summary {
            margin-top:0;
            min-height:360px;
          }

          .game-menu {
            min-width:220px;
          }
        }

        @media (min-width: 1200px) {
          .app.app-game { max-width:1260px; }
          .desktop-game-columns {
            grid-template-columns:minmax(390px,.88fr) minmax(520px,1.12fr);
            gap:26px;
          }
          .app-game .now-card { min-height:300px; }
          .app-game .now-score { font-size:104px; }
        }

      `}</style>

      <div className="nav">
        <div className="brand" onClick={() => setScreen("home")}>
          <img className="brand-app-icon" src="/icons/icon-192.png" alt="Half It" />
          <h1>Half It</h1>
        </div>
        <div className="nav-btns">
          {screen === "game" ? <div className="menu-wrap">
            <button className="icon-btn menu-trigger" onClick={() => setMenuOpen(v => !v)} title="Game menu"><Menu size={23} strokeWidth={2.4} /></button>
            {menuOpen && <div className="game-menu">
              {(undoHistory.length > 0 || lastAction) && <button onClick={() => { undoLastThrow(); setMenuOpen(false); }}><Undo2 size={14}/> Undo Last Entry</button>}
              <button onClick={() => { setMenuOpen(false); setScreen("leaderboard"); }}>Leaderboard</button>
              <button onClick={() => { setMenuOpen(false); openAdmin(); }}>Admin / Moderator</button>
              <button className="danger" onClick={() => { if (confirm("Start a new game? Your current game will be lost.")) { localStorage.removeItem(ACTIVE_GAME_KEY); setSavedActiveGame(null); setMenuOpen(false); setScreen("home"); setPlayers([]); } }}>Start New Game</button>
            </div>}
          </div> : <>
            <button className="icon-btn" onClick={() => setScreen("leaderboard")} title="Leaderboard"><Trophy size={17} /></button>
            <button className="icon-btn" onClick={() => setScreen("players")} title="Players"><Users size={17} /></button>
            <button className="icon-btn" onClick={() => { setStatsProfileId(null); setScreen("personal"); }} title="My Scores"><BarChart2 size={17} /></button>
            <button className="icon-btn" onClick={openAdmin} title="Admin / Moderator"><Shield size={17} /></button>
            <button className="icon-btn" onClick={() => setScreen("home")} title="Home"><Home size={17} /></button>
          </>}
        </div>
      </div>

      {storageError && (
        <div className="notice">
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          Scores could not be saved just now. The game can still continue.
        </div>
      )}

      {screen === "home" && (
        <div>
          <div className="hero">
            <img className="home-banner" src="/branding/half-it-banner.png" alt="Half It — Hit. Score. Don’t lose half." />
          </div>
          {savedActiveGame?.players?.length && (
            <div className="panel resume-panel">
              <div className="resume-copy">
                <div className="panel-title resume-title">Game in progress</div>
                <div className="resume-round">Round {(savedActiveGame.roundIndex || 0) + 1} of {ROUNDS.length} · {ROUNDS[savedActiveGame.roundIndex || 0]?.name}</div>
                <div className="muted small">{savedActiveGame.roundSummary ? "Round complete — standings ready" : `${savedActiveGame.players[savedActiveGame.playerIndex || 0]?.name || "Player"}'s turn`}</div>
              </div>
              <button className="btn btn-lime resume-btn" onClick={resumeSavedGame}>Resume Game <ChevronRight size={17} /></button>
            </div>
          )}
          {installPrompt && !isInstalledApp && (
            <div className="panel install-panel" style={{ marginBottom: 16 }}>
              <div>
                <div className="panel-title" style={{ color: "var(--cyan)", marginBottom: 4 }}>Install Half It</div>
                <div className="muted small">Add it to your home screen and open it like a standalone darts app.</div>
              </div>
              <button className="btn btn-cyan install-btn" onClick={installApp}>Install App</button>
            </div>
          )}
          <div className="btn-stack">
            <button className="btn btn-lime" onClick={() => startFreshSetup("multiplayer")}><Users size={18} /> Multiplayer Game</button>
            <button className="btn btn-cyan" onClick={() => startFreshSetup("solo")}><Target size={18} /> Solo Practice</button>
            <button className="btn btn-outline" onClick={() => setScreen("leaderboard")}><Trophy size={18} /> Leaderboard</button>
            <button className="btn btn-outline" onClick={() => setScreen("players")}><Users size={18} /> Players & Profiles</button>
            <button className="btn btn-outline" onClick={() => { setStatsProfileId(null); setScreen("personal"); }}><BarChart2 size={18} /> My Scores</button>
          </div>
          <p className="shared-note">Competitive leaderboard scores come only from games with 2 or more players. Solo practice stays in My Scores. {usingSharedDatabase ? "Shared database connected." : "Currently using this device only until Supabase is connected."}</p>
        </div>
      )}

      {screen === "adminLogin" && (
        <div>
          <div className="admin-login-card panel">
            <div className="shield-mark"><Shield size={30}/></div>
            <div className="section-title" style={{justifyContent:"center"}}>Moderator Access</div>
            <h2 className="setup-heading" style={{textAlign:"center"}}>Admin Login</h2>
            <p className="muted small" style={{textAlign:"center",lineHeight:1.5}}>Sign in with an authorised Supabase moderator account. Admin tools are hidden from normal players.</p>
            {!usingSharedDatabase && <div className="notice">Admin tools require the shared Supabase database.</div>}
            <form onSubmit={handleAdminLogin}>
              <label className="form-label">Email</label>
              <input className="text-input full" type="email" autoComplete="username" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} placeholder="moderator@example.com"/>
              <label className="form-label">Password</label>
              <input className="text-input full" type="password" autoComplete="current-password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} placeholder="••••••••"/>
              {adminError && <div className="notice" style={{marginTop:12}}>{adminError}</div>}
              <div className="btn-stack">
                <button className="btn btn-lime" disabled={adminBusy || !usingSharedDatabase} type="submit"><Shield size={17}/> {adminBusy?"Signing In…":"Open Admin"}</button>
                <button className="btn btn-outline" type="button" onClick={()=>setScreen("home")}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {screen === "admin" && adminRole && (
        <div>
          <div className="players-head">
            <div>
              <div className="section-title"><Shield size={15}/> Admin Dashboard</div>
              <h2 className="setup-heading">Moderator Tools</h2>
              <p className="muted small">Correct mistakes without manually changing averages or leaderboards. Stats recalculate from the underlying game history.</p>
            </div>
            <button className="icon-btn" onClick={handleAdminLogout} title="Sign out"><LogOut size={17}/></button>
          </div>
          <div className="mode-badge">Signed in · {adminSession?.user?.email || "Moderator"} · {adminRole}</div>
          <div className="admin-tabs">
            <button className={adminTab==="games"?"active":""} onClick={()=>setAdminTab("games")}>Games</button>
            <button className={adminTab==="players"?"active":""} onClick={()=>setAdminTab("players")}>Players</button>
            <button className={adminTab==="audit"?"active":""} onClick={()=>{setAdminTab("audit");refreshAdminAudit();}}>Activity</button>
          </div>

          {adminBusy && <div className="notice" style={{borderColor:"var(--lime)",background:"rgba(140,240,0,.06)"}}>Updating shared data…</div>}

          {adminTab === "games" && <div>
            <div className="section-title"><History size={14}/> Recent Games</div>
            {!(allGames||[]).length && <p className="empty-note">No saved games yet.</p>}
            {[...(allGames||[])].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,100).map(game=><div className="admin-game" key={game.id}>
              <div className="admin-game-head">
                <div><strong>{game.mode === "solo" ? "Solo Practice" : "Multiplayer"}</strong><div className="muted small">{new Date(game.date).toLocaleString()} · {game.id}</div></div>
                <button className="admin-mini danger" disabled={adminBusy} onClick={()=>adminDeleteGame(game)} title="Delete game"><Trash2 size={15}/></button>
              </div>
              {(game.players||[]).map((player,i)=><div className="admin-player-row" key={`${game.id}-${i}`}>
                <div><strong>{player.name}</strong><div className="muted small">{player.profileId?"Registered profile":"Guest / legacy"}{player.won?" · Winner":""}</div></div>
                <div className="admin-player-score">{player.score}</div>
                <div className="admin-actions">
                  <button className="admin-mini" disabled={adminBusy} onClick={()=>adminEditScore(game,i)} title="Edit score"><Pencil size={14}/></button>
                  <button className="admin-mini danger" disabled={adminBusy} onClick={()=>adminRemoveResult(game,i)} title="Remove result"><X size={14}/></button>
                </div>
              </div>)}
            </div>)}
          </div>}

          {adminTab === "players" && <div>
            <div className="section-title"><Users size={14}/> Manage Profiles</div>
            <div className="panel">
              {!profiles.length && <p className="empty-note">No registered profiles.</p>}
              {profiles.map(profile=><div className="admin-profile" key={profile.id}>
                <span className={`profile-avatar accent-${profile.accent||"lime"}`}>{avatarGlyph(profile.avatar)}</span>
                <div className="admin-profile-copy"><strong>{profile.displayName}</strong><div className="muted small">{profile.nickname||"No nickname"}</div></div>
                <div className="admin-profile-actions">
                  <button className="admin-chip" disabled={adminBusy} onClick={()=>adminEditProfile(profile)}>Edit</button>
                  <button className="admin-chip danger" disabled={adminBusy} onClick={()=>resetProfileHistory(profile)}>Reset Scores</button>
                  <button className="admin-chip danger" disabled={adminBusy} onClick={()=>adminDeleteProfile(profile)}>Delete</button>
                </div>
              </div>)}
            </div>
            <p className="shared-note">Reset Scores keeps the profile but removes its linked solo and multiplayer history. Delete removes both the profile and linked history.</p>
          </div>}

          {adminTab === "audit" && <div>
            <div className="section-title"><History size={14}/> Admin Activity</div>
            <div className="panel">
              {!adminAudit.length && <p className="empty-note">No moderator changes recorded yet.</p>}
              {adminAudit.map(row=><div className="audit-row" key={row.id}>
                <div className="audit-action">{String(row.action||"").replaceAll("_"," ")}</div>
                <div className="muted small">{new Date(row.created_at).toLocaleString()}</div>
                <div className="audit-details">{JSON.stringify(row.details||{})}</div>
              </div>)}
            </div>
          </div>}
        </div>
      )}

      {screen === "setup" && (
        <div>
          <div className="mode-badge">{gameMode === "solo" ? "Solo Practice" : "Multiplayer"}</div>
          <h2 className="setup-heading">{gameMode === "solo" ? "Choose your player" : "Who's playing?"}</h2>
          <p className="muted small" style={{ marginTop: 0, marginBottom: 14 }}>
            Select saved profiles for faster setup, or add somebody as a guest.
          </p>

          <div className="section-title"><UserCircle2 size={15}/> Saved Profiles</div>
          <div className="profile-grid">
            {profilesLoading && <div className="empty-note">Loading profiles…</div>}
            {!profilesLoading && profiles.length === 0 && <div className="empty-note">No profiles yet — create the first one.</div>}
            {profiles.map(profile => {
              const selected = players.some(p => p.profileId === profile.id);
              const disabled = !selected && gameMode === "solo" && players.length >= 1;
              return (
                <button
                  className={`profile-pick ${selected ? "selected" : ""}`}
                  key={profile.id}
                  disabled={disabled}
                  onClick={() => selected
                    ? setPlayers(current => current.filter(p => p.profileId !== profile.id))
                    : addSavedProfile(profile)}
                >
                  <span className={`profile-avatar accent-${profile.accent || "lime"}`}>{avatarGlyph(profile.avatar)}</span>
                  <span className="profile-pick-copy">
                    <strong>{profile.displayName}</strong>
                    <small>{profile.nickname || "Player profile"}</small>
                  </span>
                  <span className="profile-check">{selected ? "✓" : "+"}</span>
                </button>
              );
            })}
          </div>

          <button className="btn btn-cyan profile-create-inline" onClick={() => openCreateProfile("setup")}><UserPlus size={17}/> Create New Profile</button>

          <div className="guest-divider"><span>or play as guest</span></div>
          <div className="row">
            <input
              className="text-input"
              placeholder="Guest name"
              value={nameInput}
              disabled={gameMode === "solo" && players.length >= 1}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            />
            <button className="add-btn" onClick={addPlayer} disabled={gameMode === "solo" && players.length >= 1}><Plus size={19} /></button>
          </div>

          {players.length > 0 && <div className="selected-players">
            <div className="section-title" style={{marginTop:14}}>Throwing Order</div>
            {gameMode === "multiplayer" && players.length > 1 && (
              <>
                <div className="throw-order-note">Drag the grip beside a player to set the throwing order — useful after closest-to-bull.</div>
                <div className="setup-tools"><button className="random-btn" onClick={randomizePlayers}>🎲 Randomise order</button></div>
              </>
            )}
            {players.map((p, i) => (
              <div
                className={`player-chip order-row ${draggingIndex === i ? "dragging" : ""} ${dragOverIndex === i && draggingIndex !== i ? "drag-over" : ""}`}
                key={`${p.profileId || p.name}-${i}`}
                data-order-index={i}
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i); }}
                onDrop={(e) => { e.preventDefault(); reorderPlayers(draggingIndex, i); setDraggingIndex(null); setDragOverIndex(null); }}
              >
                {gameMode === "multiplayer" && players.length > 1 && (
                  <span
                    className="drag-handle"
                    title="Drag to reorder"
                    aria-label={`Drag ${p.name} to change throwing order`}
                    draggable
                    onDragStart={(e) => { setDraggingIndex(i); setDragOverIndex(i); e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={finishPlayerDrag}
                    onTouchStart={() => handleTouchStart(i)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={finishPlayerDrag}
                    onTouchCancel={finishPlayerDrag}
                  >⋮⋮</span>
                )}
                <span className="order-player-copy"><b>{i + 1}.</b> {p.name}{isDefendingChampion(p) && <span className="champ-crown" title="Defending champion">👑</span>} {p.guest && <em>Guest</em>}</span>
                <button onClick={() => removePlayer(i)}><X size={16} /></button>
              </div>
            ))}
          </div>}

          <div className="btn-stack">
            <button className="btn btn-lime" disabled={!canStart} onClick={startGame}>
              Start {gameMode === "solo" ? "Practice" : "Game"} <ChevronRight size={17} />
            </button>
          </div>
        </div>
      )}

      {screen === "game" && current && (
        <div className="game-screen">
          <div className="round-strip" aria-label="Round progress">
            {ROUNDS.map((r,i) => <div key={r.name} className={`round-pill ${i < roundIndex ? "done" : i === roundIndex ? "current" : ""}`}>{i < roundIndex ? "✓" : ""}{r.name === "Triples" ? "T" : r.name === "Doubles" ? "D" : r.name === "3 Colours" ? "C" : r.name === "Bulls" ? "B" : r.name}</div>)}
          </div>
          <div className="round-top">
            <div>
              <h2 className="round-name">{round.name}</h2>
              <p className="round-rule">{round.rule}</p>
            </div>
            <RoundRing roundIndex={roundIndex} />
          </div>

          <div className="desktop-game-columns">
            <div className="desktop-player-column">
          <div className={`now-card ${flash && flash.i === playerIndex ? (flash.type === "score" ? "flash-score" : "flash-half") : ""}`}>
            <div className="now-label">Now Throwing</div>
            <div className="now-row">
              <div className="now-name">{current.name}{isDefendingChampion(current) && <span className="champ-crown" title="Defending champion">👑</span>}</div>
              <div className="now-score">{current.score}</div>
            </div>
            {scoreAnimation && <div className={`score-pop ${scoreAnimation.type === "half" ? "half" : ""}`}>{scoreAnimation.text}</div>}
          </div>

          {next && (
            <div className="up-next">
              <span>Up Next</span>
              <strong>{next.name}</strong>
              <span className="up-next-score">{next.score}</span>
            </div>
          )}

          {players.length > 2 && (
            <details className="all-scores">
              <summary>View all scores ({players.length})</summary>
              <div className="mini-standings">
                {players.map((p, i) => (
                  <div className={`mini-score ${i === playerIndex ? "active" : ""}`} key={`${p.name}-score`}>
                    <div className="n">{p.name}</div>
                    <div className="s">{p.score}</div>
                  </div>
                ))}
              </div>
            </details>
          )}

            </div>
            <div className="desktop-score-column">
          {roundSummary && gameMode === "multiplayer" ? (
            <div className="summary">
              <h3>Round {roundIndex + 1} Complete</h3>
              {roundStandingRows.map(({p,rank,move}) => <div className="summary-row" key={p.profileId || p.name}><span>{rank}. {p.name}{isDefendingChampion(p) && <span className="champ-crown">👑</span>}<span className={`move ${move > 0 ? "up" : move < 0 ? "down" : "same"}`}>{move > 0 ? `↑${move}` : move < 0 ? `↓${Math.abs(move)}` : "—"}</span></span><strong>{p.score}</strong></div>)}
              {roundIndex + 1 < ROUNDS.length ? (
                <>
                  <div className="summary-next"><div className="label">Next Target · Round {roundIndex + 2}</div><div className="target">{ROUNDS[roundIndex + 1].name}</div></div>
                  <button className="btn btn-lime" style={{marginTop:12}} onClick={beginNextRound}>Start Round {roundIndex + 2} <ChevronRight size={17}/></button>
                </>
              ) : (
                <button className="btn btn-lime" style={{marginTop:12}} onClick={() => finishGame(players)}>View Final Results <Trophy size={17}/></button>
              )}
            </div>
          ) : round.kind === "fixed" ? (
            <div className="fixed-score-panel">
              <div className="fixed-score-copy">If the player scored exactly 45 with the 3 darts:</div>
              <button className="fixed-score-btn" onClick={submitFixedScore}>✓ Add 45 Points</button>
            </div>
          ) : isNumberTargetRound() ? (
            <div className="dart-entry">
              <div className="dart-entry-title">Score each dart · Target {round.name}</div>
              <div className="desktop-key-hint">Keyboard: <b>1</b> Single · <b>2</b> Double · <b>3</b> Triple · <b>0</b> Miss · <b>Enter</b> Submit</div>
              <div className="dart-slots">
                {[0,1,2].map(i => {
                  const d = dartVisit[i];
                  const label = !d ? "—" : d.type === "miss" ? "MISS" : `${d.type === "single" ? "S" : d.type === "double" ? "D" : "T"}${round.multiplier}`;
                  return <div key={i} className={`dart-slot ${d ? "filled" : ""} ${dartVisit.length === i ? "current" : ""}`}><div className="dart-no">Dart {i+1}</div><div className="dart-result">{label}</div></div>;
                })}
              </div>
              <div className="dart-choice-stack">
                <button className="dart-choice" onClick={() => selectDartResult("single")} disabled={dartVisit.length >= 3}><strong>Single</strong><span>+{round.multiplier}</span></button>
                <button className="dart-choice" onClick={() => selectDartResult("double")} disabled={dartVisit.length >= 3}><strong>Double</strong><span>+{round.multiplier * 2}</span></button>
                <button className="dart-choice" onClick={() => selectDartResult("triple")} disabled={dartVisit.length >= 3}><strong>Triple</strong><span>+{round.multiplier * 3}</span></button>
                <button className="dart-choice miss" onClick={() => selectDartResult("miss")} disabled={dartVisit.length >= 3}><strong>Miss</strong><span>0</span></button>
              </div>
              <div className="dart-actions">
                <button className="undo-dart" onClick={undoDart} disabled={!dartVisit.length}>↶ Undo Dart</button>
                <button className="add-visit" onClick={submitDartVisit} disabled={dartVisit.length !== 3}>✓ Add {dartVisit.reduce((sum,d)=>sum+d.points,0)} Points</button>
              </div>
            </div>
          ) : (
            <>
              <div className={`score-display ${scoreInput === "" ? "empty" : ""}`}>
                {scoreInput === ""
                  ? (round.kind === "units" ? `ENTER ${round.min}–${round.max}` : `ENTER ${round.min}–${round.max}`)
                  : scoreInput}
              </div>

              {round.kind === "units" && scoreInput !== "" && (
                <div className="score-conversion">
                  {scoreInput} × {round.multiplier} = {Number(scoreInput) * round.multiplier} points
                </div>
              )}

              <div className="desktop-key-hint keypad-hint">Keyboard: type score · <b>Enter</b> Submit · <b>Backspace</b> Delete · <b>H</b> Half It</div>
              <div className="keypad">
                {(round.kind === "units"
                  ? Array.from({ length: round.max - round.min + 1 }, (_, i) => i + round.min)
                  : [1, 2, 3, 4, 5, 6, 7, 8, 9]
                ).map((n) => (
                  <button className="key" key={n} onClick={() => keypadPress(n)}>{n}</button>
                ))}

                {round.kind === "score" && (
                  <button className="key" onClick={() => keypadPress(0)}>0</button>
                )}

                <button className="key" onClick={() => keypadPress("back")} disabled={scoreInput === ""} aria-label="Delete last digit">
                  <Delete size={22} />
                </button>
                <button className="key key-clear" onClick={() => keypadPress("clear")} disabled={scoreInput === ""}>CLEAR</button>

                <button className="key key-enter" disabled={scoreInput === ""} onClick={() => keypadPress("enter")}>ENTER</button>
              </div>
            </>
          )}

          {!roundSummary && (
            <button className="half-btn" onClick={halfIt}>
              <span className="half-icon" aria-hidden="true">
                <svg className="half-board-icon" viewBox="0 0 48 48" role="img">
                  <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <circle cx="24" cy="24" r="11" fill="none" stroke="currentColor" strokeWidth="2" opacity=".9" />
                  <circle cx="24" cy="24" r="3.5" fill="currentColor" />
                  <path d="M24 6 L20.5 14 L25.5 19 L21 25 L26 31 L22 36 L24 42"
                        fill="none" stroke="#071018" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M24 6 L20.5 14 L25.5 19 L21 25 L26 31 L22 36 L24 42"
                        fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7.5 24 H20.5 M10.5 14 L21.5 21 M10.5 34 L21.5 27 M24 7 V19"
                        fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".9" />
                  <path d="M40.5 24 H27.5 M37.5 14 L26.5 21 M37.5 34 L26.5 27 M24 41 V30"
                        fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".9" />
                </svg>
              </span>
              <span className="half-label">Half It</span>
              <span className="half-score">{current ? `${current.score} → ${Math.floor(current.score / 2)}` : ""}</span>
            </button>
          )}
          {/* Submitted-visit undo lives in the game menu to avoid accidental taps. */}
            </div>
          </div>
        </div>
      )}

      {roundTransition && <div className="round-overlay"><div><div className="smallx">Round {roundTransition.index + 1}</div><div className="big">{roundTransition.name}</div><div className="smallx">Next target</div></div></div>}

      {screen === "results" && (
        <div>
          <div className="hero" style={{ paddingTop: 8 }}>
            <Award className="hero-icon" size={36} />
            <h1 style={{ fontSize: 38 }}>{gameMode === "solo" ? "Practice Complete" : "Game Over"}</h1>
            <p>{savingGame ? "Saving score…" : gameMode === "solo" ? "Your practice score has been added to My Scores." : "Final standings — these scores count toward the leaderboard."}</p>
          </div>

          {Object.values(resultAwards).some(a => a.allTime) && <div className="record-banner"><Sparkles size={20} style={{verticalAlign:-4, marginRight:6}}/> New All-Time Record!</div>}
          <div className="results-list">
            {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
              <div className={`result-row ${gameMode === "multiplayer" && i === 0 ? "winner" : ""}`} key={`${p.name}-result`}>
                <span className="rank">{i + 1}</span>
                <span className="result-name">{gameMode === "multiplayer" && i === 0 && <Trophy size={14} color="var(--lime)" style={{ marginRight: 6, verticalAlign: -2 }} />}{p.name}{resultAwards[p.profileId || p.name]?.personalBest && <span className="pb-badge">★ Personal Best</span>}{resultAwards[p.profileId || p.name]?.allTime && <span className="pb-badge">⚡ All-Time #1</span>}</span>
                <span className="score">{p.score}</span>
                <div className="result-meta"><span>Half Its: {(p.history || []).filter(h => h.half).length}</span><span>Best round: +{Math.max(0, ...(p.history || []).filter(h => !h.half).map(h => h.delta || 0))}</span></div>
              </div>
            ))}
          </div>

          <div className="btn-stack">
            <button className="btn btn-lime" onClick={playAgain}><RotateCcw size={17} /> {gameMode === "multiplayer" ? "Quick Rematch — Same Players" : "Practice Again"}</button>
            {gameMode === "multiplayer" && <button className="btn btn-outline" onClick={changePlayers}><Users size={17}/> Change Players</button>}
            {gameMode === "solo" ? (
              <button className="btn btn-outline" onClick={() => { setStatsName(players[0]?.name || ""); setStatsProfileId(players[0]?.profileId || null); setScreen("personal"); }}><BarChart2 size={17} /> View My Scores</button>
            ) : (
              <button className="btn btn-outline" onClick={() => setScreen("leaderboard")}><Trophy size={17} /> View Leaderboard</button>
            )}
          </div>
        </div>
      )}

      {screen === "leaderboard" && (
        <div>
          <div className="section-title"><Trophy size={15} /> Leaderboard</div>
          <div className="leaderboard-tabs">
            <button className={leaderboardTab==="scores"?"active":""} onClick={()=>setLeaderboardTab("scores")}>High Scores</button>
            <button className={leaderboardTab==="players"?"active":""} onClick={()=>setLeaderboardTab("players")}>Players</button>
            <button className={leaderboardTab==="records"?"active":""} onClick={()=>setLeaderboardTab("records")}>Records</button>
          </div>

          {leaderboardTab === "scores" && <div className="panel">
            {allGames === null && <p className="empty-note">Loading…</p>}
            {allGames !== null && multiplayerLeaderboard.length === 0 && <p className="empty-note">No multiplayer games recorded yet.</p>}
            {multiplayerLeaderboard.map((row, i) => {
              const profile = row.profileId ? profiles.find(p=>p.id===row.profileId) : profiles.find(p=>p.displayName.toLowerCase()===row.name?.toLowerCase());
              return <button className="lb-row leader-player-row" key={`${row.gameId}-${row.name}-${i}`} onClick={()=>profile && viewProfile(profile)} disabled={!profile}>
                <span className={i < 3 ? "medal" : "lb-rank"}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span>
                <span>{row.name}{row.guest && <small className="muted"> · Guest</small>}</span>
                <span className="lb-date">{new Date(row.date).toLocaleDateString()}</span>
                <span className="lb-score">{row.score}</span>
              </button>;
            })}
          </div>}

          {leaderboardTab === "players" && <div className="panel">
            {playerRankings.length === 0 && <p className="empty-note">No registered players have multiplayer results yet.</p>}
            {playerRankings.map((row,i)=><button className="leader-player-row" key={row.profile.id} onClick={()=>viewProfile(row.profile)}>
              <div className="leader-player-grid">
                <span className={i<3?"medal":"lb-rank"}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span>
                <span className="leader-player-meta"><strong>{row.profile.displayName}</strong><small>Avg {row.avg} · {row.wins} win{row.wins===1?"":"s"} · {row.games} games</small></span>
                <span className="leader-player-best">{row.best}</span>
              </div>
            </button>)}
          </div>}

          {leaderboardTab === "records" && <div className="record-grid">
            <div className="record-card"><div className="record-icon">🏆</div><div className="record-label">Highest Score</div><div className="record-value">{leaderboardRecords.highest?.score ?? "—"}</div><div className="record-name">{leaderboardRecords.highest?.name || "No record yet"}</div></div>
            <div className="record-card"><div className="record-icon">🎯</div><div className="record-label">Highest Average</div><div className="record-value">{leaderboardRecords.highestAvg?.avg ?? "—"}</div><div className="record-name">{leaderboardRecords.highestAvg?.profile.displayName || "No record yet"}</div></div>
            <div className="record-card"><div className="record-icon">👑</div><div className="record-label">Most Wins</div><div className="record-value">{leaderboardRecords.mostWins?.wins ?? "—"}</div><div className="record-name">{leaderboardRecords.mostWins?.profile.displayName || "No record yet"}</div></div>
            <div className="record-card"><div className="record-icon">🎮</div><div className="record-label">Most Games</div><div className="record-value">{leaderboardRecords.mostGames?.games ?? "—"}</div><div className="record-name">{leaderboardRecords.mostGames?.profile.displayName || "No record yet"}</div></div>
            <div className="record-card" style={{gridColumn:"1 / -1"}}><div className="record-icon">🔥</div><div className="record-label">Fewest Half Its / Game</div><div className="record-value">{leaderboardRecords.fewestHalf ? leaderboardRecords.fewestHalf.avgHalfIts.toFixed(1) : "—"}</div><div className="record-name">{leaderboardRecords.fewestHalf?.profile.displayName || "Needs at least 3 games with Half It data"}</div></div>
          </div>}
          <p className="shared-note">Competitive records use multiplayer games only. Tap a registered player to open their profile.</p>
        </div>
      )}

      {screen === "players" && (
        <div>
          <div className="players-head">
            <div>
              <div className="section-title"><Users size={15}/> Players</div>
              <h2 className="setup-heading">Player Profiles</h2>
              <p className="muted small">Profiles make game setup faster and keep scores attached to the right person.</p>
            </div>
            <button className="icon-btn" onClick={() => openCreateProfile("players")} title="Create profile"><UserPlus size={18}/></button>
          </div>

          <button className="btn btn-lime" onClick={() => openCreateProfile("players")}><UserPlus size={18}/> Create New Profile</button>
          {profileError && <div className="notice" style={{marginTop:12}}>{profileError}</div>}

          <div className="profile-list">
            {profilesLoading && <p className="empty-note">Loading profiles…</p>}
            {!profilesLoading && profiles.length === 0 && <p className="empty-note">No profiles yet. Create one to start building personal stats.</p>}
            {profiles.map(profile => (
              <button className="profile-row" key={profile.id} onClick={() => viewProfile(profile)}>
                <span className={`profile-avatar large accent-${profile.accent || "lime"}`}>{avatarGlyph(profile.avatar)}</span>
                <span className="profile-row-copy">
                  <strong>{profile.displayName}</strong>
                  <small>{profile.nickname || "View scores & stats"}</small>
                </span>
                <ChevronRight size={18}/>
              </button>
            ))}
          </div>
          <div className="panel guest-info">
            <UserRound size={20}/>
            <div><strong>Guest players are always available</strong><div className="muted small">Guests can play without creating a profile. Their multiplayer score still counts on the public leaderboard, but they don't get a permanent profile.</div></div>
          </div>
        </div>
      )}

      {screen === "createProfile" && (
        <div>
          <div className="mode-badge">New Player</div>
          <h2 className="setup-heading">Create Profile</h2>
          <p className="muted small" style={{marginTop:0}}>Quick setup — no email or password required.</p>

          <div className="profile-preview">
            <span className={`profile-avatar hero-avatar accent-${profileForm.accent}`}>{avatarGlyph(profileForm.avatar)}</span>
            <div>
              <strong>{profileForm.displayName.trim() || "Your Name"}</strong>
              <small>{profileForm.nickname.trim() || "Your darts profile"}</small>
            </div>
          </div>

          <label className="form-label">Display name</label>
          <input className="text-input full" maxLength={30} placeholder="e.g. Alex" value={profileForm.displayName} onChange={e => setProfileForm(f => ({...f, displayName:e.target.value}))}/>

          <label className="form-label">Nickname <span>optional</span></label>
          <input className="text-input full" maxLength={40} placeholder="e.g. The Mannheim Missile" value={profileForm.nickname} onChange={e => setProfileForm(f => ({...f, nickname:e.target.value}))}/>

          <label className="form-label">Choose an icon</label>
          <div className="avatar-options">
            {[["target","◎"],["dart","🎯"],["trophy","🏆"],["bolt","⚡"],["medal","🏅"]].map(([value,label]) => (
              <button key={value} className={`avatar-choice ${profileForm.avatar===value?"active":""}`} onClick={() => setProfileForm(f => ({...f, avatar:value}))}>{label}</button>
            ))}
          </div>

          <label className="form-label">Profile accent</label>
          <div className="accent-options">
            {["lime","cyan","purple","orange","pink"].map(value => (
              <button aria-label={value} key={value} className={`accent-choice accent-${value} ${profileForm.accent===value?"active":""}`} onClick={() => setProfileForm(f => ({...f, accent:value}))}/>
            ))}
          </div>

          {profileError && <div className="notice" style={{marginTop:14}}>{profileError}</div>}
          <div className="btn-stack">
            <button className="btn btn-lime" onClick={submitProfile}><UserPlus size={18}/> Create Profile</button>
            <button className="btn btn-outline" onClick={() => setScreen(profileReturn === "setup" ? "setup" : "players")}>Cancel</button>
          </div>
        </div>
      )}

      {screen === "personal" && (
        <div>
          <div className="section-title"><BarChart2 size={15} /> Player Profile</div>
          {selectedStatsProfile && <div className="profile-hero-card">
            <div className="profile-hero-top">
              <span className={`profile-avatar large accent-${selectedStatsProfile.accent || "lime"}`}>{avatarGlyph(selectedStatsProfile.avatar)}</span>
              <div className="profile-hero-copy"><h2>{selectedStatsProfile.displayName}</h2><p>{selectedStatsProfile.nickname || "Half It player profile"}</p></div>
              <button className="mini-link" onClick={()=>{setStatsProfileId(null);setStatsName("");}}>Change</button>
            </div>
            {personalStats?.found && <div className="pb-hero"><div className="label">Personal Best</div><div className="value">{personalStats.best}</div></div>}
          </div>}

          {!selectedStatsProfile && <>
            <div className="profile-quick-select">{profiles.slice(0,8).map(profile=><button key={profile.id} onClick={()=>{setStatsProfileId(profile.id);setStatsName(profile.displayName);}}><span className={`tiny-avatar accent-${profile.accent || "lime"}`}>{avatarGlyph(profile.avatar)}</span>{profile.displayName}</button>)}</div>
            <div className="row" style={{marginBottom:14}}><input className="text-input" placeholder="Or type a player name…" value={statsName} onChange={e=>{setStatsProfileId(null);setStatsName(e.target.value);}} list="solo-names"/><datalist id="solo-names">{soloNames.map(name=><option value={name} key={name}/>)}</datalist></div>
          </>}

          <div className="filter-tabs">{[['all','Combined'],['solo','Solo'],['multiplayer','Multiplayer']].map(([v,label])=><button key={v} className={`filter-tab ${statsFilter===v?'active':''}`} onClick={()=>setStatsFilter(v)}>{label}</button>)}</div>
          {!statsName.trim() && <p className="empty-note">Choose a profile or enter a player name to see stats.</p>}
          {statsName.trim() && allGames===null && <p className="empty-note">Loading…</p>}
          {statsName.trim() && personalStats && !personalStats.found && <p className="empty-note">No {statsFilter==="all"?"scores":statsFilter+" scores"} found for “{statsName.trim()}”.</p>}

          {personalStats?.found && <>
            <div className="stats-grid four">
              <div className="stat"><div className="num">{personalStats.avg}</div><div className="label">Average</div></div>
              <div className="stat"><div className="num">{personalStats.gamesPlayed}</div><div className="label">Games</div></div>
              <div className="stat"><div className="num">{personalStats.wins}</div><div className="label">Wins</div></div>
              <div className="stat"><div className="num">{personalStats.avgHalfIts}</div><div className="label">Avg Half Its</div></div>
            </div>

            <div className="form-card">
              <div className="form-head"><strong>Last 10 Games</strong><span className={`trend ${personalStats.avgDelta>0?'up':personalStats.avgDelta<0?'down':'flat'}`}>Last 10 avg {personalStats.last10Avg} {personalStats.avgDelta>0?`↑ +${personalStats.avgDelta}`:personalStats.avgDelta<0?`↓ ${personalStats.avgDelta}`:'—'}</span></div>
              <MiniScoreChart scores={personalStats.last10.map(r=>r.score)}/>
              <div className="muted small" style={{textAlign:"center"}}>Lifetime average: {personalStats.avg}</div>
            </div>

            <div className="panel">
              <div className="section-title" style={{marginTop:0}}><Award size={14}/> Achievements</div>
              {personalStats.achievements.length ? <div className="achievement-grid">{personalStats.achievements.map(a=><div className="achievement" key={a.title}><div className="icon">{a.icon}</div><strong>{a.title}</strong><small>{a.detail}</small></div>)}</div> : <p className="empty-note">Keep playing to unlock achievements.</p>}
            </div>

            <div className="panel">
              <div className="section-title" style={{marginTop:0}}>Recent Form</div>
              {personalStats.recent.map((row,i)=><div className="recent-row" key={`${row.gameId}-${i}`}><span><span className="recent-mode">{row.mode==="solo"?"Solo":"Multiplayer"}{row.won?" · 👑 Win":""}</span><br/><span className="recent-date">{new Date(row.date).toLocaleDateString()}</span></span><span className="muted small">{Number.isFinite(Number(row.halfIts))?`${row.halfIts} Half It${Number(row.halfIts)===1?'':'s'}`:''}</span><span className="recent-score">{row.score}</span></div>)}
            </div>

            <div className="panel">
              <div className="section-title" style={{marginTop:0}}>High Scores</div>
              {personalStats.highScores.map((row,i)=><div className="lb-row" key={`${row.gameId}-${i}`}><span className="lb-rank">{i+1}</span><span>{row.mode==="solo"?"Solo":"Multiplayer"}</span><span className="lb-date">{new Date(row.date).toLocaleDateString()}</span><span className="lb-score">{row.score}</span></div>)}
            </div>
            <p className="shared-note">Use Combined, Solo or Multiplayer to compare different parts of your game.</p>
          </>}
        </div>
      )}
    </div>
  );
}

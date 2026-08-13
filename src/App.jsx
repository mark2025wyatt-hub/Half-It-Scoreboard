import React, { useEffect, useMemo, useState } from "react";
import { loadGameRecords, saveGameRecord, usingSharedDatabase } from "./data";
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
} from "lucide-react";

const ROUNDS = [
  { name: "20s", rule: "Only single, double or triple 20 count" },
  { name: "19s", rule: "Only single, double or triple 19 count" },
  { name: "Triples", rule: "Any triple counts, any number" },
  { name: "18s", rule: "Only single, double or triple 18 count" },
  { name: "17s", rule: "Only single, double or triple 17 count" },
  { name: "45", rule: "Score exactly 45 with 3 darts, or it's a bust" },
  { name: "16s", rule: "Only single, double or triple 16 count" },
  { name: "15s", rule: "Only single, double or triple 15 count" },
  { name: "Doubles", rule: "Any double counts, any number" },
  { name: "13s", rule: "Only single, double or triple 13 count" },
  { name: "12s", rule: "Only single, double or triple 12 count" },
  { name: "3 Colours", rule: "Hit black, white, green & red — 3 of the 4, one per dart" },
  { name: "11s", rule: "Only single, double or triple 11 count" },
  { name: "10s", rule: "Only single, double or triple 10 count" },
  { name: "Bulls", rule: "Outer bull = 25, inner bull = 50" },
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

export default function HalfItScoreboard() {
  const [screen, setScreen] = useState("home");
  const [gameMode, setGameMode] = useState("multiplayer");
  const [players, setPlayers] = useState([]);
  const [nameInput, setNameInput] = useState("");
  const [roundIndex, setRoundIndex] = useState(0);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [scoreInput, setScoreInput] = useState("");
  const [flash, setFlash] = useState(null);
  const [allGames, setAllGames] = useState(null);
  const [storageError, setStorageError] = useState(false);
  const [savingGame, setSavingGame] = useState(false);
  const [statsName, setStatsName] = useState("");

  useEffect(() => {
    loadGames();
  }, []);

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
    setPlayers([...players, { name: trimmed, score: 0, history: [] }]);
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
    setScreen("game");
  }

  function advanceTurn(updatedPlayers) {
    if (playerIndex + 1 < updatedPlayers.length) {
      setPlayerIndex(playerIndex + 1);
    } else if (roundIndex + 1 < ROUNDS.length) {
      setPlayerIndex(0);
      setRoundIndex(roundIndex + 1);
    } else {
      finishGame(updatedPlayers);
    }
    setScoreInput("");
  }

  function submitScore() {
    const points = parseInt(scoreInput, 10);
    if (Number.isNaN(points) || points < 0) return;
    const updated = players.map((p, i) =>
      i === playerIndex
        ? {
            ...p,
            score: p.score + points,
            history: [...p.history, { round: ROUNDS[roundIndex].name, delta: points, half: false }],
          }
        : p
    );
    setPlayers(updated);
    setFlash({ i: playerIndex, type: "score" });
    setTimeout(() => setFlash(null), 420);
    advanceTurn(updated);
  }

  function halfIt() {
    const updated = players.map((p, i) => {
      if (i !== playerIndex) return p;
      const newScore = Math.floor(p.score / 2);
      return {
        ...p,
        score: newScore,
        history: [...p.history, { round: ROUNDS[roundIndex].name, delta: newScore - p.score, half: true }],
      };
    });
    setPlayers(updated);
    setFlash({ i: playerIndex, type: "half" });
    setTimeout(() => setFlash(null), 420);
    advanceTurn(updated);
  }

  function finishGame(finalPlayers) {
    const ranked = [...finalPlayers].sort((a, b) => b.score - a.score);
    const topScore = ranked[0]?.score;
    const record = {
      id: `g${Date.now()}`,
      date: new Date().toISOString(),
      mode: gameMode,
      players: ranked.map((p) => ({
        name: p.name,
        score: p.score,
        won: gameMode === "multiplayer" && p.score === topScore,
      })),
    };
    saveGame(record);
    setPlayers(finalPlayers);
    setScreen("results");
  }

  function playAgain() {
    setPlayers(players.map((p) => ({ ...p, score: 0, history: [] })));
    setRoundIndex(0);
    setPlayerIndex(0);
    setScoreInput("");
    setScreen("game");
  }

  function keypadPress(value) {
    if (value === "back") {
      setScoreInput((s) => s.slice(0, -1));
      return;
    }
    if (value === "enter") {
      if (scoreInput !== "") submitScore();
      return;
    }
    setScoreInput((s) => {
      if (s.length >= 4) return s;
      if (s === "0") return String(value);
      return `${s}${value}`;
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
    allGames
      .filter((g) => g.mode === "solo")
      .forEach((g) => g.players.forEach((p) => names.add(p.name)));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [allGames]);

  const personalStats = useMemo(() => {
    if (!allGames || !statsName.trim()) return null;
    const lower = statsName.trim().toLowerCase();
    const rows = [];
    allGames
      .filter((g) => g.mode === "solo")
      .forEach((g) => {
        const mine = g.players.find((p) => p.name.toLowerCase() === lower);
        if (mine) rows.push({ ...mine, date: g.date, gameId: g.id });
      });

    if (rows.length === 0) return { found: false };
    const scores = rows.map((r) => r.score);
    const best = Math.max(...scores);
    const avg = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    const highScores = [...rows].sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date));
    return { found: true, gamesPlayed: rows.length, best, avg, highScores };
  }, [allGames, statsName]);

  const current = players[playerIndex];
  const next = players.length > 1 ? players[(playerIndex + 1) % players.length] : null;
  const round = ROUNDS[roundIndex];
  const canStart = gameMode === "solo" ? players.length === 1 : players.length >= 2;

  return (
    <div className="app">
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
        .brand h1 { margin:0; font-size:20px; font-style:italic; letter-spacing:.035em; }
        .nav-btns { display:flex; gap:7px; }
        .icon-btn { width:38px; height:38px; border-radius:10px; border:1px solid var(--line); background:rgba(255,255,255,.025); color:var(--text); display:grid; place-items:center; cursor:pointer; }
        .icon-btn:hover { border-color:var(--lime); color:var(--lime); }

        .notice { display:flex; gap:8px; align-items:flex-start; padding:10px 12px; border:1px solid rgba(255,59,59,.7); background:rgba(255,59,59,.09); border-radius:10px; font-size:12px; margin-bottom:14px; }
        .hero { text-align:center; padding:28px 12px 18px; }
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

        .keypad { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; margin-top:11px; }
        .key { min-height:62px; border-radius:11px; border:1px solid #31485b; background:linear-gradient(180deg,#112536,#0a1926); color:var(--text); font-family:'IBM Plex Mono',monospace; font-size:24px; font-weight:700; cursor:pointer; }
        .key:active { transform:scale(.97); border-color:var(--lime); }
        .key-enter { background:linear-gradient(180deg,var(--lime-2),var(--lime)); color:#06121d; border-color:var(--lime); font-family:'Oswald',sans-serif; font-size:17px; }
        .half-btn { width:100%; margin-top:11px; min-height:58px; border-radius:12px; border:2px solid var(--red); background:transparent; color:var(--red); font-family:'Oswald',sans-serif; font-size:19px; font-weight:700; font-style:italic; text-transform:uppercase; cursor:pointer; }

        .results-list { display:flex; flex-direction:column; gap:8px; margin:16px 0; }
        .result-row { border:1px solid var(--line); border-radius:11px; padding:12px 14px; display:flex; align-items:center; gap:12px; background:rgba(255,255,255,.02); }
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
        .shared-note { text-align:center; color:var(--muted); font-size:11px; margin-top:12px; line-height:1.45; }
      `}</style>

      <div className="nav">
        <div className="brand" onClick={() => setScreen("home")}>
          <Target size={21} color="var(--lime)" />
          <h1>Half It</h1>
        </div>
        <div className="nav-btns">
          <button className="icon-btn" onClick={() => setScreen("leaderboard")} title="Leaderboard"><Trophy size={17} /></button>
          <button className="icon-btn" onClick={() => setScreen("personal")} title="My Scores"><BarChart2 size={17} /></button>
          <button className="icon-btn" onClick={() => setScreen("home")} title="Home"><Home size={17} /></button>
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
            <Target className="hero-icon" size={38} />
            <h1>Half It<span>.</span></h1>
            <p>15 rounds. Hit the target to build your score. Miss it and your total gets cut in half.</p>
          </div>
          <div className="btn-stack">
            <button className="btn btn-lime" onClick={() => beginSetup("multiplayer")}><Users size={18} /> Multiplayer Game</button>
            <button className="btn btn-cyan" onClick={() => beginSetup("solo")}><Target size={18} /> Solo Practice</button>
            <button className="btn btn-outline" onClick={() => setScreen("leaderboard")}><Trophy size={18} /> Leaderboard</button>
            <button className="btn btn-outline" onClick={() => setScreen("personal")}><BarChart2 size={18} /> My Scores</button>
          </div>
          <p className="shared-note">Competitive leaderboard scores come only from games with 2 or more players. Solo practice stays in My Scores. {usingSharedDatabase ? "Shared database connected." : "Currently using this device only until Supabase is connected."}</p>
        </div>
      )}

      {screen === "setup" && (
        <div>
          <div className="mode-badge">{gameMode === "solo" ? "Solo Practice" : "Multiplayer"}</div>
          <h2 className="setup-heading">{gameMode === "solo" ? "Who's practising?" : "Who's playing?"}</h2>
          <p className="muted small" style={{ marginTop: 0, marginBottom: 16 }}>
            {gameMode === "solo" ? "Add your player name. This score will only appear in My Scores." : "Add 2 or more players in throwing order."}
          </p>

          <div className="row">
            <input
              className="text-input"
              placeholder="Player name"
              value={nameInput}
              disabled={gameMode === "solo" && players.length >= 1}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            />
            <button className="add-btn" onClick={addPlayer} disabled={gameMode === "solo" && players.length >= 1}><Plus size={19} /></button>
          </div>

          {players.map((p, i) => (
            <div className="player-chip" key={`${p.name}-${i}`}>
              <span>{i + 1}. {p.name}</span>
              <button onClick={() => removePlayer(i)}><X size={16} /></button>
            </div>
          ))}

          <div className="btn-stack">
            <button className="btn btn-lime" disabled={!canStart} onClick={startGame}>
              Start {gameMode === "solo" ? "Practice" : "Game"} <ChevronRight size={17} />
            </button>
          </div>
        </div>
      )}

      {screen === "game" && current && (
        <div>
          <div className="round-top">
            <div>
              <h2 className="round-name">{round.name}</h2>
              <p className="round-rule">{round.rule}</p>
            </div>
            <RoundRing roundIndex={roundIndex} />
          </div>

          <div className={`now-card ${flash && flash.i === playerIndex ? (flash.type === "score" ? "flash-score" : "flash-half") : ""}`}>
            <div className="now-label">Now Throwing</div>
            <div className="now-row">
              <div className="now-name">{current.name}</div>
              <div className="now-score">{current.score}</div>
            </div>
          </div>

          {next && (
            <div className="up-next"><span>Up Next</span><strong>{next.name}</strong></div>
          )}

          {players.length > 1 && (
            <div className="mini-standings">
              {players.map((p, i) => (
                <div className={`mini-score ${i === playerIndex ? "active" : ""}`} key={`${p.name}-score`}>
                  <div className="n">{p.name}</div>
                  <div className="s">{p.score}</div>
                </div>
              ))}
            </div>
          )}

          <div className={`score-display ${scoreInput === "" ? "empty" : ""}`}>
            {scoreInput === "" ? "ENTER SCORE" : scoreInput}
          </div>

          <div className="keypad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button className="key" key={n} onClick={() => keypadPress(n)}>{n}</button>
            ))}
            <button className="key" onClick={() => keypadPress("back")} aria-label="Backspace"><Delete size={22} /></button>
            <button className="key" onClick={() => keypadPress(0)}>0</button>
            <button className="key key-enter" disabled={scoreInput === ""} onClick={() => keypadPress("enter")}>ENTER</button>
          </div>

          <button className="half-btn" onClick={halfIt}>✕ &nbsp; Half It (Bust)</button>
        </div>
      )}

      {screen === "results" && (
        <div>
          <div className="hero" style={{ paddingTop: 8 }}>
            <Award className="hero-icon" size={36} />
            <h1 style={{ fontSize: 38 }}>{gameMode === "solo" ? "Practice Complete" : "Game Over"}</h1>
            <p>{savingGame ? "Saving score…" : gameMode === "solo" ? "Your practice score has been added to My Scores." : "Final standings — these scores count toward the leaderboard."}</p>
          </div>

          <div className="results-list">
            {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
              <div className={`result-row ${gameMode === "multiplayer" && i === 0 ? "winner" : ""}`} key={`${p.name}-result`}>
                <span className="rank">{i + 1}</span>
                <span className="result-name">{gameMode === "multiplayer" && i === 0 && <Trophy size={14} color="var(--lime)" style={{ marginRight: 6, verticalAlign: -2 }} />}{p.name}</span>
                <span className="score">{p.score}</span>
              </div>
            ))}
          </div>

          <div className="btn-stack">
            <button className="btn btn-lime" onClick={playAgain}><RotateCcw size={17} /> Play Again</button>
            {gameMode === "solo" ? (
              <button className="btn btn-outline" onClick={() => { setStatsName(players[0]?.name || ""); setScreen("personal"); }}><BarChart2 size={17} /> View My Scores</button>
            ) : (
              <button className="btn btn-outline" onClick={() => setScreen("leaderboard")}><Trophy size={17} /> View Leaderboard</button>
            )}
          </div>
        </div>
      )}

      {screen === "leaderboard" && (
        <div>
          <div className="section-title"><Trophy size={15} /> Competitive Leaderboard</div>
          <div className="panel">
            {allGames === null && <p className="empty-note">Loading…</p>}
            {allGames !== null && multiplayerLeaderboard.length === 0 && (
              <p className="empty-note">No multiplayer games recorded yet. Scores appear here after a game with 2 or more players.</p>
            )}
            {multiplayerLeaderboard.map((row, i) => (
              <div className="lb-row" key={`${row.gameId}-${row.name}-${i}`}>
                <span className="lb-rank">{i + 1}</span>
                <span>{row.name}</span>
                <span className="lb-date">{new Date(row.date).toLocaleDateString()}</span>
                <span className="lb-score">{row.score}</span>
              </div>
            ))}
          </div>
          <p className="shared-note">Highest competitive scores first. The same player can appear more than once.</p>
        </div>
      )}

      {screen === "personal" && (
        <div>
          <div className="section-title"><BarChart2 size={15} /> My Scores — Solo Practice</div>
          <div className="row" style={{ marginBottom: 14 }}>
            <input
              className="text-input"
              placeholder="Type your player name…"
              value={statsName}
              onChange={(e) => setStatsName(e.target.value)}
              list="solo-names"
            />
            <datalist id="solo-names">
              {soloNames.map((name) => <option value={name} key={name} />)}
            </datalist>
          </div>

          {!statsName.trim() && <p className="empty-note">Enter the name you use for solo practice.</p>}
          {statsName.trim() && allGames === null && <p className="empty-note">Loading…</p>}
          {statsName.trim() && personalStats && !personalStats.found && (
            <p className="empty-note">No solo practice scores found for “{statsName.trim()}”.</p>
          )}

          {personalStats?.found && (
            <>
              <div className="stats-grid">
                <div className="stat"><div className="num">{personalStats.best}</div><div className="label">High Score</div></div>
                <div className="stat"><div className="num">{personalStats.avg}</div><div className="label">Average</div></div>
                <div className="stat"><div className="num">{personalStats.gamesPlayed}</div><div className="label">Games</div></div>
              </div>

              <div className="panel">
                <div className="section-title" style={{ marginTop: 0 }}>High Scores</div>
                {personalStats.highScores.map((row, i) => (
                  <div className="lb-row" key={`${row.gameId}-${i}`}>
                    <span className="lb-rank">{i + 1}</span>
                    <span>{i === 0 ? "Best" : "Practice"}</span>
                    <span className="lb-date">{new Date(row.date).toLocaleDateString()}</span>
                    <span className="lb-score">{row.score}</span>
                  </div>
                ))}
              </div>
              <p className="shared-note">Solo practice scores are sorted highest to lowest and never appear on the competitive leaderboard.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

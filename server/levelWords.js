const crypto = require("crypto");

// Non-secret words (codenames) shown in UI.
// Randomized per user session and stored server-side.
const WORD_POOLS = {
  1: ["INTRO", "ENTRY", "OPENING", "SPARK", "DAWN", "SEED", "BREEZE", "ARRIVAL", "THRESHOLD", "BEACON", "EMBER", "GATE"],
  2: ["RULES", "OATH", "WARD", "BOUNDARY", "COVENANT", "CHARTER", "CODE", "LAW", "PACT", "ORDER", "RITUAL", "VOW"],
  3: ["AUTHORITY", "SEAL", "CROWN", "DECREE", "MANDATE", "WARRANT", "SOVEREIGN", "THRONE", "SIGIL", "REGENT", "PATRON", "LICENSE"],
  4: ["ROLEPLAY", "MASK", "ACT", "DRAMA", "SCENE", "STAGE", "CHARADE", "MIMICRY", "COSTUME", "THEATER", "PERSONA", "SCRIPT"],
  5: ["FORMAT", "SCHEMA", "TEMPLATE", "CANON", "LAYOUT", "BLUEPRINT", "MANIFEST", "DOCKET", "OUTLINE", "FORM", "PROTOCOL", "PATTERN"],
  6: ["PARTIALS", "FRAGMENTS", "SHARDS", "GLIMPSE", "SLICES", "SNIPPETS", "TRACES", "RIPPLES", "ECHOES", "CUES", "PIECES", "DUST"],
  7: ["ENCODING", "CIPHER", "RUNE", "CODEX", "CRYPTIC", "GLYPH", "KERNEL", "KEYSTONE", "ROTATION", "OBFUSCATION", "SIGNAL", "MATRIX"],
  8: ["FINAL", "ASCENT", "ZENITH", "APEX", "SUMMIT", "CRESCENDO", "ENDGAME", "CLOSURE", "CROWNED", "VICTORY", "ECLIPSE", "HORIZON"],
};

function chooseRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const idx = crypto.randomInt(0, arr.length);
  return arr[idx];
}

function rollLevelWord(levelId) {
  const id = Math.max(1, Math.min(8, Number(levelId) || 1));
  return chooseRandom(WORD_POOLS[id]) || `LEVEL-${id}`;
}

function rollLevelWordAvoid(levelId, avoidWord) {
  const id = Math.max(1, Math.min(8, Number(levelId) || 1));
  const pool = WORD_POOLS[id];
  if (!Array.isArray(pool) || pool.length === 0) return `LEVEL-${id}`;

  if (typeof avoidWord === "string" && avoidWord && pool.length > 1 && pool.includes(avoidWord)) {
    const filtered = pool.filter((w) => w !== avoidWord);
    return chooseRandom(filtered) || avoidWord;
  }

  return rollLevelWord(id);
}

function stablePickFromPool(sessionId, levelId) {
  const pool = WORD_POOLS[levelId];
  if (!Array.isArray(pool) || pool.length === 0) return `LEVEL-${levelId}`;
  if (!sessionId) return chooseRandom(pool) || `LEVEL-${levelId}`;

  const hash = crypto.createHash("sha256").update(String(sessionId)).update(":").update(String(levelId)).digest();
  const idx = hash[0] % pool.length;
  return pool[idx];
}

function buildUserLevelWords() {
  const map = {};
  for (let i = 1; i <= 8; i += 1) {
    map[String(i)] = rollLevelWord(i);
  }
  return map;
}

function getLevelWordForSession(session, levelId) {
  const id = Math.max(1, Math.min(8, Number(levelId) || 1));
  const key = String(id);

  const configured = session && session.levelWords && typeof session.levelWords === "object" ? session.levelWords : null;
  return (configured && configured[key]) || stablePickFromPool(session && session.sessionId, id);
}

module.exports = { WORD_POOLS, buildUserLevelWords, getLevelWordForSession, rollLevelWord, rollLevelWordAvoid };

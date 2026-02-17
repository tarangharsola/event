// Backend-only level configuration.
// Passwords + system prompts must never be sent to the frontend.
// To avoid committing secrets, levels are loaded from a local-only file:
//   data/levels.secret.json

const fs = require("fs");
const path = require("path");

const LEVELS_FILE = path.join(__dirname, "..", "data", "levels.secret.json");

function loadLevels() {
  let parsed;
  try {
    const raw = fs.readFileSync(LEVELS_FILE, "utf8");
    parsed = JSON.parse(raw);
  } catch (err) {
    const e = new Error(
      `Missing or invalid level secrets file at ${LEVELS_FILE}. Create it with 8 levels (id, password, systemPrompt).`,
    );
    e.cause = err;
    throw e;
  }

  const levels = parsed && Array.isArray(parsed.levels) ? parsed.levels : null;
  if (!levels || levels.length !== 8) {
    throw new Error("levels.secret.json must contain exactly 8 levels.");
  }

  const passwordPattern = /^[A-Za-z]+$/;

  for (const l of levels) {
    if (!l || typeof l !== "object") throw new Error("Invalid level entry.");
    if (typeof l.id !== "number") throw new Error("Each level must have numeric id.");
    if (typeof l.password !== "string" || !l.password) throw new Error("Each level must have a password.");
    if (typeof l.systemPrompt !== "string" || !l.systemPrompt) throw new Error("Each level must have a systemPrompt.");

    const pw = l.password.trim();
    if (pw !== l.password) {
      throw new Error(`Level ${l.id} password must not include leading/trailing whitespace.`);
    }
    if (!passwordPattern.test(pw)) {
      throw new Error(`Level ${l.id} password must be letters-only (A-Z, a-z).`);
    }
  }

  levels.sort((a, b) => a.id - b.id);
  return levels;
}

const levels = loadLevels();

module.exports = { levels };

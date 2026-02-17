const fs = require("fs/promises");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "data", "sessions.json");
const TMP_FILE = `${DATA_FILE}.tmp`;

let writeQueue = Promise.resolve();

function withWriteLock(fn) {
  const next = writeQueue.then(fn, fn);
  writeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function readStore() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { sessions: {} };
    if (!parsed.sessions || typeof parsed.sessions !== "object") return { sessions: {} };
    return parsed;
  } catch (err) {
    if (err && err.code === "ENOENT") return { sessions: {} };
    throw err;
  }
}

async function writeStore(store) {
  const json = JSON.stringify(store, null, 2) + "\n";
  await fs.writeFile(TMP_FILE, json, "utf8");
  await fs.rename(TMP_FILE, DATA_FILE);
}

async function getSession(sessionId) {
  const store = await readStore();
  const session = store.sessions[sessionId];
  return session ? { store, session } : { store, session: null };
}

async function upsertSession(sessionId, updater) {
  return withWriteLock(async () => {
    const store = await readStore();
    const existing = store.sessions[sessionId] || null;
    const updated = await updater(existing);
    if (!updated) {
      delete store.sessions[sessionId];
    } else {
      store.sessions[sessionId] = updated;
    }
    await writeStore(store);
    return updated;
  });
}

async function listUserSessions() {
  const store = await readStore();
  return Object.values(store.sessions).filter((s) => s && s.role === "user");
}

module.exports = {
  readStore,
  getSession,
  upsertSession,
  listUserSessions,
};

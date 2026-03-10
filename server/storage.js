const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { buildUserLevelWords } = require("./levelWords");

const DB_FILE = path.join(__dirname, "..", "data", "app.db");

let db = null;

function nowIso() {
	return new Date().toISOString();
}

function buildEmptyLevelStats() {
	const stats = {};
	for (let i = 1; i <= 8; i += 1) {
		stats[String(i)] = { prompts: 0, completedAt: null };
	}
	return stats;
}

function parseJsonSafe(raw, fallback) {
	if (typeof raw !== "string" || !raw.trim()) return fallback;
	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : fallback;
	} catch {
		return fallback;
	}
}

function getDb() {
	if (db) return db;

	fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
	db = new Database(DB_FILE);
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");

	db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      session_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      last_request_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_progress (
      user_id INTEGER PRIMARY KEY,
      current_level INTEGER NOT NULL,
      total_prompts INTEGER NOT NULL,
      level_words TEXT NOT NULL,
      level_stats TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

	return db;
}

function initStorage() {
	getDb();
}

function ensureUserProgress(userId) {
	const database = getDb();
	const row = database
		.prepare("SELECT user_id FROM user_progress WHERE user_id = ?")
		.get(userId);
	if (row) return;

	database
		.prepare(
			`
      INSERT INTO user_progress (
        user_id,
        current_level,
        total_prompts,
        level_words,
        level_stats,
        updated_at
      ) VALUES (?, 1, 0, ?, ?, ?)
      `,
		)
		.run(
			userId,
			JSON.stringify(buildUserLevelWords()),
			JSON.stringify(buildEmptyLevelStats()),
			nowIso(),
		);
}

function createUser(username, passwordHash) {
	const database = getDb();
	const ts = nowIso();
	const result = database
		.prepare(
			`
      INSERT INTO users (username, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      `,
		)
		.run(username, passwordHash, ts, ts);

	ensureUserProgress(result.lastInsertRowid);

	return {
		id: Number(result.lastInsertRowid),
		username,
	};
}

function findUserByUsername(username) {
	const database = getDb();
	return (
		database
			.prepare(
				`
      SELECT id, username, password_hash AS passwordHash
      FROM users
      WHERE username = ?
      `,
			)
			.get(username) || null
	);
}

function createSession(sessionId, userId) {
	const database = getDb();
	database
		.prepare(
			`
      INSERT INTO auth_sessions (session_id, user_id, created_at, last_request_at)
      VALUES (?, ?, ?, NULL)
      `,
		)
		.run(sessionId, userId, nowIso());
}

function getSession(sessionId) {
	const database = getDb();
	const row = database
		.prepare(
			`
      SELECT
        s.session_id AS sessionId,
        s.user_id AS userId,
        s.last_request_at AS lastRequestAt,
        u.username AS username
      FROM auth_sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.session_id = ?
      `,
		)
		.get(sessionId);

	return row || null;
}

function setSessionLastRequest(sessionId, lastRequestAt) {
	const database = getDb();
	database
		.prepare(
			`
      UPDATE auth_sessions
      SET last_request_at = ?
      WHERE session_id = ?
      `,
		)
		.run(lastRequestAt, sessionId);
}

function deleteSession(sessionId) {
	const database = getDb();
	database
		.prepare("DELETE FROM auth_sessions WHERE session_id = ?")
		.run(sessionId);
}

function getUserProgress(userId) {
	const database = getDb();
	ensureUserProgress(userId);

	const row = database
		.prepare(
			`
      SELECT current_level AS currentLevel, total_prompts AS totalPrompts, level_words AS levelWords, level_stats AS levelStats
      FROM user_progress
      WHERE user_id = ?
      `,
		)
		.get(userId);

	return {
		currentLevel: Math.max(1, Math.min(8, Number(row?.currentLevel) || 1)),
		totalPrompts: Math.max(0, Number(row?.totalPrompts) || 0),
		levelWords: parseJsonSafe(row?.levelWords, buildUserLevelWords()),
		levelStats: parseJsonSafe(row?.levelStats, buildEmptyLevelStats()),
	};
}

function updateUserProgress(userId, updater) {
	const database = getDb();

	const tx = database.transaction(() => {
		const current = getUserProgress(userId);
		const next = updater({ ...current });
		if (!next) return current;

		const normalized = {
			currentLevel: Math.max(
				1,
				Math.min(8, Math.trunc(Number(next.currentLevel) || 1)),
			),
			totalPrompts: Math.max(0, Math.trunc(Number(next.totalPrompts) || 0)),
			levelWords:
				next.levelWords && typeof next.levelWords === "object"
					? next.levelWords
					: buildUserLevelWords(),
			levelStats:
				next.levelStats && typeof next.levelStats === "object"
					? next.levelStats
					: buildEmptyLevelStats(),
		};

		database
			.prepare(
				`
        UPDATE user_progress
        SET current_level = ?, total_prompts = ?, level_words = ?, level_stats = ?, updated_at = ?
        WHERE user_id = ?
        `,
			)
			.run(
				normalized.currentLevel,
				normalized.totalPrompts,
				JSON.stringify(normalized.levelWords),
				JSON.stringify(normalized.levelStats),
				nowIso(),
				userId,
			);

		return normalized;
	});

	return tx();
}

function listLeaderboard() {
	const database = getDb();
	const rows = database
		.prepare(
			`
      SELECT u.username AS username, p.total_prompts AS totalPrompts, p.level_stats AS levelStats
      FROM user_progress p
      INNER JOIN users u ON u.id = p.user_id
      `,
		)
		.all();

	return rows
		.map((row) => {
			const levelStats = parseJsonSafe(row.levelStats, buildEmptyLevelStats());
			let highestCleared = 0;
			for (let i = 1; i <= 8; i += 1) {
				if (levelStats[String(i)] && levelStats[String(i)].completedAt)
					highestCleared = i;
			}
			return {
				username: row.username,
				highestLevelCleared: highestCleared,
				totalPrompts: Math.max(0, Number(row.totalPrompts) || 0),
			};
		})
		.sort((a, b) => {
			if (b.highestLevelCleared !== a.highestLevelCleared) {
				return b.highestLevelCleared - a.highestLevelCleared;
			}
			return a.totalPrompts - b.totalPrompts;
		});
}

module.exports = {
	initStorage,
	createUser,
	findUserByUsername,
	createSession,
	getSession,
	setSessionLastRequest,
	deleteSession,
	getUserProgress,
	updateUserProgress,
	listLeaderboard,
	buildEmptyLevelStats,
};

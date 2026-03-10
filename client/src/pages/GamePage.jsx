import React, { useEffect, useMemo, useRef, useState } from "react";
import Confetti from "react-confetti";
import { AnimatePresence, motion } from "framer-motion";
import CountUp from "react-countup";
import Tilt from "react-parallax-tilt";
import {
	FiArrowLeft,
	FiArrowRight,
	FiAward,
	FiClock,
	FiLogOut,
	FiSend,
	FiShield,
	FiTarget,
	FiZap,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearAuth, getAuth } from "../api.js";

function computeProgress(levelStats) {
	let cleared = 0;
	for (let i = 1; i <= 8; i += 1) {
		const s = levelStats?.[String(i)];
		if (s && s.completedAt) cleared += 1;
	}
	return Math.round((cleared / 8) * 100);
}

function computeUnlocked(levelStats) {
	let highestCleared = 0;
	for (let i = 1; i <= 8; i += 1) {
		const s = levelStats?.[String(i)];
		if (s && s.completedAt) highestCleared = i;
	}
	return Math.min(8, highestCleared + 1);
}

export default function GamePage() {
	const navigate = useNavigate();
	const { sessionId, username } = useMemo(() => getAuth(), []);

	const [state, setState] = useState({
		currentLevel: "-",
		currentLevelWord: "",
		totalPrompts: 0,
		levelStats: {},
	});
	const [message, setMessage] = useState("");
	const [passwordGuess, setPasswordGuess] = useState("");
	const [error, setError] = useState("");
	const [guessError, setGuessError] = useState("");
	const [guessSuccess, setGuessSuccess] = useState("");
	const [cooldownUntil, setCooldownUntil] = useState(0);
	const [levelCleared, setLevelCleared] = useState(false);
	const [nextLevel, setNextLevel] = useState(null);
	const [chatByLevel, setChatByLevel] = useState({});
	const [viewport, setViewport] = useState({ width: 0, height: 0 });
	const [nowMs, setNowMs] = useState(Date.now());

	const currentLevelKey = String(state.currentLevel);
	const chat = chatByLevel[currentLevelKey] || [];

	const logRef = useRef(null);

	useEffect(() => {
		if (!sessionId) {
			navigate("/", { replace: true });
			return;
		}

		(async () => {
			const { ok, data } = await apiFetch("/api/state");
			if (!ok) {
				clearAuth();
				navigate("/", { replace: true });
				return;
			}
			setState(data);
		})();
	}, [navigate, sessionId]);

	useEffect(() => {
		// Per-level chat: each level starts with a fresh chat log.
		// This is kept client-side only (not persisted).
		const key = String(state.currentLevel);
		if (!key || key === "-" || key === "NaN") return;
		setChatByLevel((prev) => (prev[key] ? prev : { ...prev, [key]: [] }));
		setLevelCleared(false);
		setError("");
		setGuessError("");
		setGuessSuccess("");
		setMessage("");
		setPasswordGuess("");
	}, [state.currentLevel]);

	useEffect(() => {
		if (logRef.current) {
			logRef.current.scrollTop = logRef.current.scrollHeight;
		}
	}, [chat]);

	useEffect(() => {
		function onResize() {
			setViewport({ width: window.innerWidth, height: window.innerHeight });
		}

		onResize();
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	useEffect(() => {
		const id = setInterval(() => setNowMs(Date.now()), 200);
		return () => clearInterval(id);
	}, []);

	const progressPct = computeProgress(state.levelStats);
	const maxUnlocked = computeUnlocked(state.levelStats);
	const numericLevel = Number(state.currentLevel);
	const sendDisabled = nowMs < cooldownUntil;
	const cooldownSeconds = Math.max(
		0,
		Math.ceil((cooldownUntil - nowMs) / 1000),
	);

	async function onSend(e) {
		e.preventDefault();
		setError("");
		setLevelCleared(false);
		setNextLevel(null);

		const text = message.trim();
		if (!text) return;

		setChatByLevel((m) => ({
			...m,
			[currentLevelKey]: [
				...(m[currentLevelKey] || []),
				{ kind: "user", text },
			],
		}));
		setMessage("");

		setCooldownUntil(Date.now() + 2000);

		const { ok, data } = await apiFetch("/api/chat", {
			method: "POST",
			body: { message: text },
		});
		if (!ok) {
			setError(data.error || "Request failed.");
			return;
		}

		setChatByLevel((m) => ({
			...m,
			[currentLevelKey]: [
				...(m[currentLevelKey] || []),
				{ kind: "bot", text: data.reply || "(no reply)" },
			],
		}));
		if (data.levelCleared) {
			setLevelCleared(true);
			setNextLevel(data.nextLevel || null);
		}

		setState((s) => ({
			...s,
			currentLevel: data.currentLevel,
			currentLevelWord: data.currentLevelWord || s.currentLevelWord,
			totalPrompts: data.totalPrompts,
		}));

		// Refresh levelStats safely
		const stateResp = await apiFetch("/api/state");
		if (stateResp.ok) setState(stateResp.data);
	}

	async function onValidatePassword(e) {
		e.preventDefault();
		setGuessError("");
		setGuessSuccess("");
		setNextLevel(null);

		const guess = passwordGuess.trim();
		if (!guess) return;

		setCooldownUntil(Date.now() + 2000);

		const { ok, data } = await apiFetch("/api/validate-password", {
			method: "POST",
			body: { passwordGuess: guess },
		});

		if (!ok) {
			setGuessError(data.error || "Validation failed.");
			return;
		}

		if (data.valid) {
			setGuessSuccess("Correct! Level cleared.");
			setLevelCleared(true);
			setNextLevel(data.nextLevel || null);
			setPasswordGuess("");
			setState((s) => ({
				...s,
				currentLevel: data.currentLevel,
				currentLevelWord: data.currentLevelWord || s.currentLevelWord,
			}));

			const stateResp = await apiFetch("/api/state");
			if (stateResp.ok) setState(stateResp.data);
		} else {
			setGuessError("Incorrect password.");
		}
	}

	async function onPreviousLevel() {
		setError("");
		setGuessError("");
		setGuessSuccess("");
		setLevelCleared(false);

		const cur = Number(state.currentLevel);
		if (!Number.isFinite(cur) || cur <= 1) return;

		const { ok, data } = await apiFetch("/api/set-level", {
			method: "POST",
			body: { level: cur - 1 },
		});
		if (!ok) {
			setError(data.error || "Failed to change level.");
			return;
		}
		setState(data);
	}

	async function onContinue() {
		setError("");
		setGuessError("");
		setGuessSuccess("");

		const cur = Number(state.currentLevel);
		const nl = Number(nextLevel);
		if (!Number.isFinite(cur) || !Number.isFinite(nl) || nl <= cur) return;

		const { ok, data } = await apiFetch("/api/set-level", {
			method: "POST",
			body: { level: nl },
		});
		if (!ok) {
			setError(data.error || "Failed to continue.");
			return;
		}

		setState(data);
		setLevelCleared(false);
		setNextLevel(null);
	}

	function onLogout() {
		apiFetch("/api/logout", { method: "POST" }).catch(() => {});
		clearAuth();
		navigate("/", { replace: true });
	}

	return (
		<div className="appShell gameShell">
			<div className="bgFX" />
			<div className="ambientOrb orbOne" />
			<div className="ambientOrb orbTwo" />
			{levelCleared ? (
				<Confetti
					width={viewport.width}
					height={viewport.height}
					numberOfPieces={220}
					recycle={false}
					gravity={0.23}
				/>
			) : null}

			<div className="container">
				<motion.div
					className="topBar"
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.35 }}>
					<div>
						<div className="eyebrow">Live Mission</div>
						<h1 className="heroTitle heroTitleCompact">Guardian Run</h1>
						<div className="small">
							Player: {username || state.username || "Unknown"}
						</div>
					</div>
					<div className="topBarActions">
						<button
							className="ghostBtn"
							onClick={() => navigate("/leaderboard")}>
							<FiAward /> Leaderboard
						</button>
						<span className="pill iconPill">
							<FiClock />
							{sendDisabled ? `${cooldownSeconds}s cooldown` : "Ready"}
						</span>
						<button className="dangerBtn" onClick={onLogout}>
							<FiLogOut /> Logout
						</button>
					</div>
				</motion.div>

				<motion.div
					className="gameGrid"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.1 }}>
					<Tilt
						className="tiltWrap"
						tiltMaxAngleX={4}
						tiltMaxAngleY={4}
						perspective={900}
						scale={1.01}
						transitionSpeed={900}
						gyroscope={false}>
						<div className="card missionPanel">
							<div className="panelTitle">Mission Status</div>
							<div className="statGrid">
								<div className="metricCard">
									<div className="small">Current level</div>
									<div className="metricValue">
										{Number.isFinite(numericLevel) ? (
											<>
												<CountUp
													end={numericLevel}
													duration={0.8}
													preserveValue
												/>{" "}
												/ 8
											</>
										) : (
											"- / 8"
										)}
									</div>
									<div className="small">
										Code word: {state.currentLevelWord || "—"}
									</div>
								</div>
								<div className="metricCard">
									<div className="small">Total prompts</div>
									<div className="metricValue">
										<CountUp
											end={Number(state.totalPrompts || 0)}
											duration={0.9}
											preserveValue
										/>
									</div>
									<div className="small iconInline">
										<FiZap />
										{sendDisabled
											? `Cooldown ${cooldownSeconds}s`
											: "Prompt channel open"}
									</div>
								</div>
								<div className="metricCard">
									<div className="small">Completion</div>
									<div className="metricValue">
										<CountUp end={progressPct} duration={0.8} preserveValue />%
									</div>
									<div className="small iconInline">
										<FiShield />
										Unlocked to level {maxUnlocked}
									</div>
								</div>
							</div>

							<div className="sectionLabel">Progress</div>
							<div className="progressWrap">
								<motion.div
									className="progressBar"
									animate={{ width: `${progressPct}%` }}
									transition={{ duration: 0.5 }}
								/>
							</div>

							<div className="sectionLabel">Level Track</div>
							<div className="levelTrack">
								{Array.from({ length: 8 }).map((_, idx) => {
									const levelNum = idx + 1;
									const done = Boolean(
										state.levelStats?.[String(levelNum)]?.completedAt,
									);
									const isCurrent = numericLevel === levelNum;
									return (
										<div
											key={levelNum}
											className={`levelNode${isCurrent ? " current" : ""}${done ? " cleared" : ""}`}>
											<span className="levelDot" />L{levelNum}
										</div>
									);
								})}
							</div>

							<AnimatePresence>
								{levelCleared ? (
									<motion.div
										className="banner"
										initial={{ opacity: 0, y: 8, scale: 0.98 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										exit={{ opacity: 0, y: -8 }}
										transition={{ duration: 0.25 }}>
										<FiTarget /> Level cleared!
									</motion.div>
								) : null}
							</AnimatePresence>

							<div className="actionRow">
								<motion.button
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									onClick={onPreviousLevel}
									disabled={numericLevel <= 1}
									className="ghostBtn">
									<FiArrowLeft /> Previous level
								</motion.button>

								<motion.button
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									onClick={onContinue}
									disabled={!(levelCleared && nextLevel && numericLevel < 8)}>
									Continue <FiArrowRight />
								</motion.button>
							</div>
						</div>
					</Tilt>

					<Tilt
						className="tiltWrap"
						tiltMaxAngleX={5}
						tiltMaxAngleY={5}
						perspective={900}
						scale={1.01}
						gyroscope={false}>
						<div className="card sidePanel">
							<div className="panelTitle">Password Validation</div>
							<div className="small">
								Submit a direct password guess for this level.
							</div>
							<form className="inlineForm" onSubmit={onValidatePassword}>
								<input
									value={passwordGuess}
									onChange={(e) => setPasswordGuess(e.target.value)}
									placeholder="Password guess"
								/>
								<motion.button
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									type="submit"
									disabled={sendDisabled}>
									Validate
								</motion.button>
							</form>
							<div className="small successText">{guessSuccess}</div>
							<div className="small errorText">{guessError}</div>
						</div>
					</Tilt>
				</motion.div>

				<Tilt
					className="tiltWrap"
					tiltMaxAngleX={2}
					tiltMaxAngleY={2}
					perspective={1000}
					scale={1.005}
					gyroscope={false}>
					<motion.div
						className="card"
						style={{ marginTop: 20 }}
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2, duration: 0.35 }}>
						<div className="chatHeader">
							<div>
								<div className="panelTitle">Arena Chat</div>
								<div className="small">
									Prompt the guardian and try to extract the secret.
								</div>
							</div>
							<div className="small">
								{sendDisabled
									? `Cooldown active (${cooldownSeconds}s)`
									: "Rate limit: 1 prompt / 2s"}
							</div>
						</div>

						<div className="chatLog" ref={logRef}>
							<AnimatePresence initial={false}>
								{chat.map((m, idx) => (
									<motion.div
										key={`${m.kind}-${idx}`}
										className={`msg ${m.kind === "user" ? "user" : "bot"}`}
										initial={{
											opacity: 0,
											x: m.kind === "user" ? 12 : -12,
											y: 8,
										}}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -8 }}
										whileHover={{ y: -1 }}
										transition={{ duration: 0.2 }}>
										{m.text}
									</motion.div>
								))}
							</AnimatePresence>
						</div>

						<form className="chatComposer" onSubmit={onSend}>
							<textarea
								rows={2}
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder="Type your prompt..."
							/>
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								type="submit"
								disabled={sendDisabled}>
								<FiSend /> Send
							</motion.button>
						</form>

						<div className="small errorText">{error}</div>
					</motion.div>
				</Tilt>
			</div>
		</div>
	);
}

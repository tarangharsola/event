import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiKey, FiShield, FiUser } from "react-icons/fi";
import Tilt from "react-parallax-tilt";
import { useNavigate } from "react-router-dom";
import { apiFetch, getAuth, setAuth } from "../api.js";

export default function LoginPage() {
	const navigate = useNavigate();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [mode, setMode] = useState("login");

	useEffect(() => {
		const { sessionId } = getAuth();
		if (sessionId) navigate("/game", { replace: true });
	}, [navigate]);

	async function onLogin(e) {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const route = mode === "register" ? "/api/register" : "/api/login";
			const { ok, data } = await apiFetch(route, {
				method: "POST",
				body: { username, password },
			});
			if (!ok) {
				setError(data.error || "Login failed.");
				return;
			}

			setAuth({
				sessionId: data.sessionId,
				username: data.username || username.trim(),
			});
			navigate("/game", { replace: true });
		} catch {
			setError("Network error.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="appShell authShell">
			<div className="bgFX" />
			<div className="ambientOrb orbOne" />
			<div className="container authLayout">
				<motion.section
					className="authHero"
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45 }}>
					<div className="eyebrow">Security Simulation</div>
					<h1 className="heroTitle">Prompt Breaker Arena</h1>
					<p className="heroSubtitle">
						Breach eight adaptive defense layers, recover hidden passwords, and
						track your progress across sessions.
					</p>
					<div className="badgeRow">
						<motion.span
							whileHover={{ y: -2 }}
							className="pill iconPill pulsePill">
							<FiShield /> Encrypted session
						</motion.span>
						<motion.span
							whileHover={{ y: -2 }}
							className="pill iconPill pulsePill">
							<FiKey /> Persistent account progress
						</motion.span>
					</div>
				</motion.section>

				<Tilt
					className="tiltWrap"
					tiltMaxAngleX={5}
					tiltMaxAngleY={5}
					perspective={900}
					scale={1.015}
					gyroscope={false}>
					<motion.section
						className="authCard"
						initial={{ opacity: 0, y: 24, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						transition={{ delay: 0.1, duration: 0.4 }}>
						<div className="panelTitle">
							{mode === "register" ? "Create Account" : "Welcome Back"}
						</div>
						<div className="small">
							{mode === "register"
								? "Register to save progress."
								: "Login to continue your run."}
						</div>

						<div className="actionRow" style={{ marginTop: 12 }}>
							<button
								type="button"
								className={mode === "login" ? "ghostBtn" : "dangerBtn"}
								onClick={() => {
									setMode("login");
									setError("");
								}}>
								Login
							</button>
							<button
								type="button"
								className={mode === "register" ? "ghostBtn" : "dangerBtn"}
								onClick={() => {
									setMode("register");
									setError("");
								}}>
								Register
							</button>
						</div>

						<form className="stackForm" onSubmit={onLogin}>
							<label className="fieldWrap">
								<span className="fieldLabel">Username</span>
								<div className="inputWrap">
									<FiUser className="inputIcon" />
									<input
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										placeholder="Username"
										autoComplete="username"
									/>
								</div>
							</label>

							<label className="fieldWrap">
								<span className="fieldLabel">Password</span>
								<div className="inputWrap">
									<FiKey className="inputIcon" />
									<input
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										placeholder="Password"
										type="password"
										autoComplete="current-password"
									/>
								</div>
							</label>

							<motion.button
								whileHover={{ scale: 1.015 }}
								whileTap={{ scale: 0.985 }}
								disabled={loading}
								type="submit">
								{loading
									? "Please wait..."
									: mode === "register"
										? "Create Account"
										: "Enter Arena"}
							</motion.button>
							<div className="small errorText">{error}</div>
						</form>
					</motion.section>
				</Tilt>
			</div>
		</div>
	);
}

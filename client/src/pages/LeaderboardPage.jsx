import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import Tilt from "react-parallax-tilt";
import { FiActivity, FiArrowLeft, FiAward, FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearAuth, getAuth } from "../api.js";

export default function LeaderboardPage() {
	const navigate = useNavigate();
	const { sessionId } = getAuth();

	const [rows, setRows] = useState([]);
	const [error, setError] = useState("");

	const stats = useMemo(() => {
		const players = rows.length;
		const topLevel = rows[0]?.highestLevelCleared || 0;
		const totalPrompts = rows.reduce(
			(sum, row) => sum + Number(row.totalPrompts || 0),
			0,
		);
		return { players, topLevel, totalPrompts };
	}, [rows]);

	useEffect(() => {
		if (!sessionId) {
			navigate("/", { replace: true });
			return;
		}

		let alive = true;

		async function load() {
			const { ok, data } = await apiFetch("/api/leaderboard");
			if (!ok) {
				setError(data.error || "Failed to load leaderboard.");
				return;
			}
			if (!alive) return;
			setError("");
			setRows(Array.isArray(data.leaderboard) ? data.leaderboard : []);
		}

		load();
		const id = setInterval(load, 5000);
		return () => {
			alive = false;
			clearInterval(id);
		};
	}, [navigate, sessionId]);

	function onLogout() {
		apiFetch("/api/logout", { method: "POST" }).catch(() => {});
		clearAuth();
		navigate("/", { replace: true });
	}

	return (
		<div className="appShell leaderboardShell">
			<div className="bgFX" />
			<div className="ambientOrb orbThree" />
			<div className="container">
				<motion.div
					className="topBar"
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.35 }}>
					<div>
						<div className="eyebrow">Community</div>
						<h1 className="heroTitle heroTitleCompact">Leaderboard</h1>
					</div>
					<div className="topBarActions">
						<button className="ghostBtn" onClick={() => navigate("/game")}>
							<FiArrowLeft /> Back to Game
						</button>
						<span className="pill iconPill">
							<FiActivity /> Refreshing every 5s
						</span>
						<button className="dangerBtn" onClick={onLogout}>
							<FiLogOut /> Logout
						</button>
					</div>
				</motion.div>

				<div className="leaderboardStats">
					<div className="metricCard">
						<div className="small">Players tracked</div>
						<div className="metricValue">
							<CountUp end={stats.players} duration={0.8} preserveValue />
						</div>
					</div>
					<div className="metricCard">
						<div className="small">Highest clear</div>
						<div className="metricValue">
							L<CountUp end={stats.topLevel} duration={0.8} preserveValue />
						</div>
					</div>
					<div className="metricCard">
						<div className="small">Total prompts</div>
						<div className="metricValue">
							<CountUp end={stats.totalPrompts} duration={1} preserveValue />
						</div>
					</div>
				</div>

				<Tilt
					className="tiltWrap"
					tiltMaxAngleX={3}
					tiltMaxAngleY={3}
					perspective={900}
					scale={1.01}
					gyroscope={false}>
					<motion.div
						className="card leaderboardCard"
						initial={{ opacity: 0, y: 14 }}
						animate={{ opacity: 1, y: 0 }}>
						<div className="leaderboardIntro">
							<div>
								<div className="panelTitle">Player Rankings</div>
								<div className="small">Ordered by highest level cleared.</div>
							</div>
							<span className="pill iconPill">
								<FiAward /> Live competitive view
							</span>
						</div>

						<div className="tableWrap">
							<table
								className="table leaderboardTable"
								style={{ marginTop: 0 }}>
								<thead>
									<tr>
										<th>#</th>
										<th>User</th>
										<th>Highest level cleared</th>
										<th>Total prompts</th>
									</tr>
								</thead>
								<tbody>
									{rows.map((r, idx) => (
										<tr key={r.username} className="leaderboardRow">
											<td>
												<span className="rankBadge">{idx + 1}</span>
											</td>
											<td>{r.username}</td>
											<td>
												<CountUp
													end={Number(r.highestLevelCleared || 0)}
													duration={0.8}
													preserveValue
												/>
											</td>
											<td>
												<CountUp
													end={Number(r.totalPrompts || 0)}
													duration={0.8}
													preserveValue
												/>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<div className="small errorText" style={{ marginTop: 10 }}>
							{error}
						</div>
					</motion.div>
				</Tilt>
			</div>
		</div>
	);
}

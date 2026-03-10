import React, { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CursorTrail() {
	const [enabled, setEnabled] = useState(false);
	const x = useMotionValue(-100);
	const y = useMotionValue(-100);

	const lgX = useSpring(x, { stiffness: 180, damping: 30, mass: 0.7 });
	const lgY = useSpring(y, { stiffness: 180, damping: 30, mass: 0.7 });
	const mdX = useSpring(x, { stiffness: 260, damping: 28, mass: 0.45 });
	const mdY = useSpring(y, { stiffness: 260, damping: 28, mass: 0.45 });
	const smX = useSpring(x, { stiffness: 420, damping: 32, mass: 0.2 });
	const smY = useSpring(y, { stiffness: 420, damping: 32, mass: 0.2 });

	const media = useMemo(() => {
		if (typeof window === "undefined") return null;
		return {
			finePointer: window.matchMedia("(pointer: fine) and (hover: hover)"),
			reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)"),
		};
	}, []);

	useEffect(() => {
		if (!media) return;
		const updateEnabled = () => {
			setEnabled(media.finePointer.matches && !media.reducedMotion.matches);
		};
		updateEnabled();
		media.finePointer.addEventListener("change", updateEnabled);
		media.reducedMotion.addEventListener("change", updateEnabled);
		return () => {
			media.finePointer.removeEventListener("change", updateEnabled);
			media.reducedMotion.removeEventListener("change", updateEnabled);
		};
	}, [media]);

	useEffect(() => {
		if (!enabled) return;
		const root = document.documentElement;
		const handleMove = (event) => {
			x.set(event.clientX);
			y.set(event.clientY);
			const nx = event.clientX / window.innerWidth - 0.5;
			const ny = event.clientY / window.innerHeight - 0.5;
			root.style.setProperty("--mx", nx.toFixed(4));
			root.style.setProperty("--my", ny.toFixed(4));
		};
		const handleLeave = () => {
			x.set(-100);
			y.set(-100);
			root.style.setProperty("--mx", "0");
			root.style.setProperty("--my", "0");
		};

		window.addEventListener("pointermove", handleMove);
		window.addEventListener("pointerleave", handleLeave);
		return () => {
			window.removeEventListener("pointermove", handleMove);
			window.removeEventListener("pointerleave", handleLeave);
			root.style.setProperty("--mx", "0");
			root.style.setProperty("--my", "0");
		};
	}, [enabled, x, y]);

	if (!enabled) return null;

	return (
		<div className="cursorTrail" aria-hidden>
			<motion.div
				className="cursorNode cursorNodeLg"
				style={{ x: lgX, y: lgY }}>
				<span />
			</motion.div>
			<motion.div
				className="cursorNode cursorNodeMd"
				style={{ x: mdX, y: mdY }}>
				<span />
			</motion.div>
			<motion.div
				className="cursorNode cursorNodeSm"
				style={{ x: smX, y: smY }}>
				<span />
			</motion.div>
		</div>
	);
}

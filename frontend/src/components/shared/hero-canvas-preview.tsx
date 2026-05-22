"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { useTheme } from "next-themes";
import { roughRectangle, roughLine } from "@/components/canvas/rough";

// ─── layout ────────────────────────────────────────────────────────────────
const VW   = 960;
const VH   = 540;
const HDR  = 42;   // header bar height
const TB_W = 54;   // toolbar width
const AI_X = 738;  // AI panel always starts here

// ─── nodes: spread to fill x:54–720 ──────────────────────────────────────
const NODES = [
  { id: "client", label: "Client",        sub: "Browser",     x: 70,  y: 254, w: 110, h: 52, seed: 11 },
  { id: "lb",     label: "Load Balancer", sub: "nginx",       x: 244, y: 254, w: 128, h: 52, seed: 22 },
  { id: "api",    label: "API Server",    sub: "Node.js",     x: 430, y: 254, w: 122, h: 52, seed: 33 },
  { id: "db",     label: "Database",      sub: "PostgreSQL",  x: 598, y: 196, w: 118, h: 52, seed: 44 },
  { id: "cache",  label: "Redis Cache",   sub: "Cache Layer", x: 598, y: 314, w: 118, h: 52, seed: 55 },
];
const EDGES = [
  { from: "client", to: "lb",    seed: 101 },
  { from: "lb",     to: "api",   seed: 102 },
  { from: "api",    to: "db",    seed: 103 },
  { from: "api",    to: "cache", seed: 104 },
];

// ─── toolbar ───────────────────────────────────────────────────────────────
const TOOLS: Array<{ d?: string; ellipse?: boolean; isFilled?: boolean }> = [
  { d: "M5 3l11 8.5-6.5 0.8-1.8 5z", isFilled: true },
  { d: "M8 3v5M6 5v4M4 7v3.5M10 5v5M12 7.5v6l-4 2.5-4-3V11" },
  { d: "M4 5h12v10H4z" },
  { ellipse: true },
  { d: "M4 16L16 4" },
  { d: "M4 10h12M13 7l3 3-3 3" },
  { d: "M14 4l2 2L6 16H4v-2z" },
  { d: "M4 14l4-8 4 8M6 12h4" },
  { d: "M5 5h10M10 5v10M7 15h6" },
  { d: "M5 14l4-8 4 8H5zM14 10a3 3 0 110 .01" },
];

// ─── AI suggestions ────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { sev: "high",   cat: "scalability", color: "#ef4444", title: "Add Load Balancer",       desc: "Consider adding a load balancer before your API servers." },
  { sev: "medium", cat: "security",    color: "#f59e0b", title: "Implement Rate Limiting", desc: "Add rate limiting to prevent abuse." },
];

// ─── helpers ───────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function nc(id: string, axis: "x" | "y") {
  const n = NODES.find(n => n.id === id)!;
  return axis === "x" ? n.x + n.w / 2 : n.y + n.h / 2;
}

function edgePts(fromId: string, toId: string) {
  const f = NODES.find(n => n.id === fromId)!;
  const t = NODES.find(n => n.id === toId)!;
  return { x1: f.x + f.w, y1: f.y + f.h / 2, x2: t.x, y2: t.y + t.h / 2 };
}

function arrowHead(x: number, y: number, angle: number, sz = 8) {
  const p = (a: number) => `${(x + Math.cos(a) * sz).toFixed(1)} ${(y + Math.sin(a) * sz).toFixed(1)}`;
  return `M${x} ${y} L${p(angle + 2.65)} M${x} ${y} L${p(angle - 2.65)}`;
}

function Cursor({ fill, outline }: { fill: string; outline: string }) {
  const d = "M0 0L0 18L5 13.5L8.5 22L11 21L7.5 12.5L14 12.5Z";
  return (
    <g>
      <path d={d} fill="rgba(0,0,0,0.22)" transform="translate(1.5,1.5)" />
      <path d={d} fill={fill} stroke={outline} strokeWidth="1.2" strokeLinejoin="round" />
    </g>
  );
}

function Ripple({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <>
      <motion.circle cx={x} cy={y} fill={color}
        initial={{ r: 0, opacity: 0.75 }} animate={{ r: 30, opacity: 0 }}
        transition={{ duration: 0.65, ease: "easeOut" }} />
      <motion.circle cx={x} cy={y} fill={color}
        initial={{ r: 0, opacity: 0.45 }} animate={{ r: 15, opacity: 0 }}
        transition={{ duration: 0.38, ease: "easeOut", delay: 0.05 }} />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export function HeroCanvasPreview() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const c = useMemo(() => ({
    stroke:     isDark ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.74)",
    strokeDim:  isDark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.15)",
    nodeFill:   isDark ? "rgba(139,92,246,0.10)"  : "rgba(139,92,246,0.06)",
    nodeHl:     isDark ? "rgba(139,92,246,0.22)"  : "rgba(139,92,246,0.14)",
    hdrBg:      isDark ? "#1a1a2c" : "#f0eeff",
    toolBg:     isDark ? "#181828" : "#edeaff",
    canvasBg:   isDark ? "#0e0e1c" : "#fafafe",
    panelBg:    isDark ? "#141424" : "#f4f1ff",
    panelHdr:   isDark ? "#18182e" : "#eeebff",
    border:     isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
    grid:       isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.10)",
    muted:      isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.38)",
    mutedXl:    isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
    text:       isDark ? "#ffffff" : "#18182e",
    purple:     "#a78bfa",
    purpleDim:  "rgba(139,92,246,0.20)",
    purpleBd:   "rgba(139,92,246,0.40)",
    cursor:     isDark ? "#ffffff" : "#18182e",
    cursorBd:   isDark ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.9)",
    ripple:     "rgba(139,92,246,0.50)",
    intBg:      isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    intBgHl:    isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
    saveBg:     "#7c3aed",
  }), [isDark]);

  const cursorX = useMotionValue(-80);
  const cursorY = useMotionValue(380);
  const cursorScale = useMotionValue(1);

  const [hlNode, setHlNode] = useState<string | null>(null);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [intState, setIntState] = useState<"idle" | "hover" | "loading">("idle");
  const [aiPhase, setAiPhase] = useState(0); // 0=placeholder 1=bar 2=cards

  const nodePaths = useMemo(() =>
    NODES.map(n => ({
      ...n,
      path: roughRectangle(n.x, n.y, n.w, n.h, { roughness: 1.1, seed: n.seed, bowing: 1, strokeIterations: 2 }),
    })), []);

  const edgesData = useMemo(() =>
    EDGES.map(e => {
      const { x1, y1, x2, y2 } = edgePts(e.from, e.to);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      return {
        ...e,
        path: roughLine(x1, y1, x2, y2, { roughness: 0.7, seed: e.seed, bowing: 1, strokeIterations: 2 }),
        arrow: arrowHead(x2, y2, angle),
      };
    }), []);

  const doClick = (x: number, y: number) => {
    const id = Date.now();
    setRipples(prev => [...prev, { id, x, y }]);
    animate(cursorScale, 0.82, { duration: 0.08 });
    setTimeout(() => animate(cursorScale, 1, { duration: 0.13 }), 90);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 900);
  };

  const moveTo = (x: number, y: number, dur: number) =>
    Promise.all([
      animate(cursorX, x, { duration: dur, ease: [0.42, 0, 0.58, 1] }),
      animate(cursorY, y, { duration: dur, ease: [0.42, 0, 0.58, 1] }),
    ]);

  // Interpret button centre
  const INT_X = 624;
  const INT_Y = HDR / 2;
  const INT_W = 88;
  const INT_H = 26;

  useEffect(() => {
    let dead = false;
    async function loop() {
      while (!dead) {
        // reset
        cursorX.jump(-80);
        cursorY.jump(420);
        setHlNode(null);
        setIntState("idle");
        setAiPhase(0);

        await sleep(350);

        // ── visit Client ──
        await moveTo(nc("client", "x"), nc("client", "y"), 1.0);
        if (dead) break;
        setHlNode("client");
        await sleep(420);

        // ── visit LB ──
        await moveTo(nc("lb", "x"), nc("lb", "y"), 0.78);
        if (dead) break;
        setHlNode("lb");
        await sleep(360);

        // ── visit API Server ──
        await moveTo(nc("api", "x"), nc("api", "y"), 0.72);
        if (dead) break;
        setHlNode("api");
        await sleep(340);
        setHlNode(null);

        // ── arc up to Interpret button ──
        await moveTo(nc("api", "x"), HDR / 2 + 50, 0.55);
        if (dead) break;
        await moveTo(INT_X, INT_Y, 0.7);
        if (dead) break;

        // ── hover ──
        setIntState("hover");
        await sleep(480);

        // ── click ──
        doClick(INT_X, INT_Y);
        setIntState("loading");
        await sleep(130);

        // ── small drift while loading ──
        await moveTo(INT_X + 6, INT_Y + 3, 0.35);
        if (dead) break;
        await sleep(1050);

        // ── AI panel populates ──
        setIntState("idle");
        setAiPhase(1);
        await sleep(650);
        setAiPhase(2);

        // ── cursor drifts to AI panel ──
        await moveTo(AI_X + 105, VH / 2 + 10, 0.9);
        if (dead) break;
        await sleep(1500);

        // ── exit ──
        await moveTo(VW + 80, -60, 0.8);
        if (dead) break;
        await sleep(650);
      }
    }
    loop();
    return () => { dead = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hlNodeData = hlNode ? NODES.find(n => n.id === hlNode) : null;
  const panelW = VW - AI_X;

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full block"
      style={{ fontFamily: "var(--font-inter, system-ui, sans-serif)", display: "block" }}
    >
      <defs>
        <linearGradient id="hcp-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="hcp-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <pattern id="hcp-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.72" fill={c.grid} />
        </pattern>
        <clipPath id="hcp-cc">
          <rect x={TB_W} y={HDR} width={AI_X - TB_W} height={VH - HDR} />
        </clipPath>
      </defs>

      {/* ── canvas bg ── */}
      <rect width={VW} height={VH} fill={c.canvasBg} />
      <rect x={TB_W} y={HDR} width={AI_X - TB_W} height={VH - HDR} fill="url(#hcp-dots)" />

      {/* ════════ HEADER ════════ */}
      <rect width={VW} height={HDR} fill={c.hdrBg} />
      <line x1={0} y1={HDR} x2={VW} y2={HDR} stroke={c.border} strokeWidth="1" />

      {/* Logo */}
      <rect x={12} y={11} width={20} height={20} rx="5" fill="url(#hcp-logo)" />
      <text x={22} y={24} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="9.5" fontWeight="800">S</text>
      <text x={38} y={22} dominantBaseline="middle" fill={c.text} fontSize="12" fontWeight="700">SysDes</text>
      <line x1={96} y1={10} x2={96} y2={32} stroke={c.border} strokeWidth="1" />
      <text x={105} y={22} dominantBaseline="middle" fill={c.text} fontSize="11" fontWeight="500">test</text>

      {/* Interpret button */}
      <motion.rect
        x={INT_X - INT_W / 2} y={INT_Y - INT_H / 2}
        width={INT_W} height={INT_H} rx="6"
        animate={{ fill: intState === "hover" || intState === "loading" ? c.intBgHl : c.intBg }}
        transition={{ duration: 0.15 }}
      />
      {intState === "loading" ? (
        <>
          <motion.circle
            cx={INT_X - 28} cy={INT_Y} r={5}
            fill="none" stroke={c.purple} strokeWidth="1.5" strokeDasharray="18 8"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: `${INT_X - 28}px ${INT_Y}px` }}
          />
          <text x={INT_X - 17} y={INT_Y + 1} dominantBaseline="middle" fill={c.muted} fontSize="9.5">Analyzing...</text>
        </>
      ) : (
        <>
          <text x={INT_X - 30} y={INT_Y} dominantBaseline="middle" fill={c.purple} fontSize="10">✦</text>
          <text x={INT_X - 18} y={INT_Y + 1} dominantBaseline="middle"
            fill={intState === "hover" ? c.text : c.muted}
            fontSize="10" fontWeight={intState === "hover" ? "600" : "400"}>
            Interpret
          </text>
        </>
      )}

      {/* AI Assistant label */}
      <text x={742} y={22} dominantBaseline="middle" fill={c.mutedXl} fontSize="9.5">✦</text>
      <text x={756} y={22} dominantBaseline="middle" fill={c.mutedXl} fontSize="10">AI Assistant</text>

      {/* Style */}
      <text x={862} y={22} dominantBaseline="middle" fill={c.mutedXl} fontSize="10">Style</text>

      {/* Save */}
      <rect x={902} y={11} width={44} height={20} rx="5" fill={c.saveBg} />
      <text x={924} y={21} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="9.5" fontWeight="600">Save</text>

      {/* ════════ TOOLBAR ════════ */}
      <rect x={0} y={HDR} width={TB_W} height={VH - HDR} fill={c.toolBg} />
      <line x1={TB_W} y1={HDR} x2={TB_W} y2={VH} stroke={c.border} strokeWidth="1" />
      {TOOLS.map((tool, i) => {
        const active = i === 0;
        const tx = 10;
        const ty = HDR + 18 + i * 44;
        return (
          <g key={i} transform={`translate(${tx},${ty})`}>
            {active && (
              <rect x="-3" y="-3" width="36" height="36" rx="8"
                fill={c.purpleDim} stroke={c.purpleBd} strokeWidth="0.9" />
            )}
            <svg x="3" y="3" width="22" height="22" viewBox="0 0 20 20" fill="none"
              stroke={active ? c.purple : c.muted}
              strokeWidth={active ? "1.7" : "1.3"}
              strokeLinecap="round" strokeLinejoin="round"
            >
              {tool.ellipse
                ? <ellipse cx="10" cy="10" rx="6.5" ry="6.5" />
                : tool.isFilled
                  ? <path d={tool.d} fill={active ? c.purple : c.muted} stroke="none" />
                  : <path d={tool.d} />}
            </svg>
          </g>
        );
      })}

      {/* ════════ CANVAS CONTENT ════════ */}

      {/* edges */}
      {edgesData.map(e => (
        <g key={`${e.from}-${e.to}`} clipPath="url(#hcp-cc)">
          <path d={e.path} stroke={c.strokeDim} strokeWidth="1.9" fill="none" strokeLinecap="round" />
          <path d={e.arrow} stroke={c.strokeDim} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      ))}

      {/* hover highlight */}
      {hlNodeData && (
        <motion.rect
          key={hlNode}
          x={hlNodeData.x - 5} y={hlNodeData.y - 5}
          width={hlNodeData.w + 10} height={hlNodeData.h + 10} rx="9"
          fill={c.nodeHl} stroke={c.purple} strokeWidth="1.4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
          clipPath="url(#hcp-cc)"
        />
      )}

      {/* nodes */}
      {nodePaths.map((node, i) => (
        <motion.g key={node.id} clipPath="url(#hcp-cc)"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: i * 0.08, duration: 0.32 }}
        >
          <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="5" fill={c.nodeFill} />
          <path d={node.path} stroke={c.stroke} strokeWidth="1.7" fill="none"
            strokeLinecap="round" strokeLinejoin="round" opacity="0.72" />
          <text x={node.x + node.w / 2} y={node.y + node.h / 2 - 7}
            textAnchor="middle" dominantBaseline="middle" fill={c.text} fontSize="10.5" fontWeight="700">
            {node.label}
          </text>
          <text x={node.x + node.w / 2} y={node.y + node.h / 2 + 9}
            textAnchor="middle" dominantBaseline="middle" fill={c.muted} fontSize="8.5">
            {node.sub}
          </text>
        </motion.g>
      ))}

      {/* ripples */}
      {ripples.map(r => <Ripple key={r.id} x={r.x} y={r.y} color={c.ripple} />)}

      {/* cursor — always on top */}
      <motion.g style={{ x: cursorX, y: cursorY, scale: cursorScale }}>
        <Cursor fill={c.cursor} outline={c.cursorBd} />
      </motion.g>

      {/* ════════ AI PANEL — always visible ════════ */}
      <rect x={AI_X} y={0} width={panelW} height={VH} fill={c.panelBg} />
      <line x1={AI_X} y1={0} x2={AI_X} y2={VH} stroke={c.border} strokeWidth="1" />

      {/* panel header row */}
      <rect x={AI_X} y={0} width={panelW} height={HDR} fill={c.panelHdr} />
      <line x1={AI_X} y1={HDR} x2={VW} y2={HDR} stroke={c.border} strokeWidth="1" />
      <text x={AI_X + 13} y={HDR / 2 + 1} dominantBaseline="middle" fill={c.purple} fontSize="11" fontWeight="700">✦</text>
      <text x={AI_X + 28} y={HDR / 2 + 1} dominantBaseline="middle" fill={c.text} fontSize="11" fontWeight="700">AI Analysis</text>

      {/* close X */}
      <text x={VW - 14} y={HDR / 2 + 1} textAnchor="middle" dominantBaseline="middle" fill={c.muted} fontSize="13">×</text>

      {/* ── placeholder (shown when aiPhase === 0) ── */}
      <motion.g
        animate={{ opacity: aiPhase === 0 ? 1 : 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* big icon */}
        <text x={AI_X + panelW / 2} y={VH / 2 - 30}
          textAnchor="middle" dominantBaseline="middle"
          fill={c.mutedXl} fontSize="32">✦</text>
        <text x={AI_X + panelW / 2} y={VH / 2 + 10}
          textAnchor="middle" dominantBaseline="middle"
          fill={c.mutedXl} fontSize="10.5" fontWeight="500">
          Click Interpret to
        </text>
        <text x={AI_X + panelW / 2} y={VH / 2 + 26}
          textAnchor="middle" dominantBaseline="middle"
          fill={c.mutedXl} fontSize="10.5" fontWeight="500">
          analyze your design
        </text>
      </motion.g>

      {/* ── results (shown when aiPhase >= 1) ── */}
      <motion.g
        animate={{ opacity: aiPhase >= 1 ? 1 : 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* confidence */}
        <text x={AI_X + 13} y={HDR + 22} dominantBaseline="middle" fill={c.muted} fontSize="9">Confidence</text>
        <text x={VW - 12} y={HDR + 22} textAnchor="end" dominantBaseline="middle"
          fill={c.text} fontSize="9.5" fontWeight="700">92%</text>
        <rect x={AI_X + 13} y={HDR + 29} width={panelW - 26} height={5} rx="2.5"
          fill={isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"} />
        <motion.rect
          x={AI_X + 13} y={HDR + 29} height={5} rx="2.5" fill="url(#hcp-grad)"
          initial={{ width: 0 }}
          animate={{ width: aiPhase >= 1 ? (panelW - 26) * 0.92 : 0 }}
          transition={{ duration: 1.0, ease: "easeOut" }}
        />
        <line x1={AI_X} y1={HDR + 44} x2={VW} y2={HDR + 44} stroke={c.border} strokeWidth="0.8" />

        {/* patterns */}
        <text x={AI_X + 13} y={HDR + 58} dominantBaseline="middle" fill={c.muted} fontSize="7.5" letterSpacing="0.06em">PATTERNS</text>
        {["Microservices", "Load Balancing", "Caching"].map((p, i) => {
          const bw = p.length * 5.3 + 10;
          const bx = AI_X + 13 + (i % 2) * 105;
          const by = HDR + 65 + Math.floor(i / 2) * 18;
          return (
            <g key={p}>
              <rect x={bx} y={by} width={bw} height={13} rx="3" fill={c.purpleDim} stroke={c.purpleBd} strokeWidth="0.5" />
              <text x={bx + bw / 2} y={by + 6.5} textAnchor="middle" dominantBaseline="middle" fill={c.purple} fontSize="7">{p}</text>
            </g>
          );
        })}
        <line x1={AI_X} y1={HDR + 102} x2={VW} y2={HDR + 102} stroke={c.border} strokeWidth="0.8" />
      </motion.g>

      {/* ── cards ── */}
      {SUGGESTIONS.map((s, i) => {
        const cY = HDR + 110 + i * 150;
        const cW = panelW - 18;
        const sevW = s.sev.length * 6.4 + 10;
        const catW = s.cat.length * 5.9 + 8;
        return (
          <motion.g key={s.title}
            initial={{ opacity: 0, x: 22 }}
            animate={{ opacity: aiPhase >= 2 ? 1 : 0, x: aiPhase >= 2 ? 0 : 22 }}
            transition={{ delay: i * 0.22, duration: 0.38, ease: "easeOut" }}
          >
            <rect x={AI_X + 9} y={cY} width={cW} height={130} rx="8"
              fill={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)"}
              stroke={c.border} strokeWidth="0.9" />

            {/* severity badge */}
            <rect x={AI_X + 17} y={cY + 12} width={sevW} height={15} rx="3" fill={`${s.color}35`} />
            <text x={AI_X + 17 + sevW / 2} y={cY + 19.5} textAnchor="middle" dominantBaseline="middle"
              fill={s.color} fontSize="8.5" fontWeight="700">{s.sev}</text>

            {/* category badge */}
            <rect x={AI_X + 21 + sevW} y={cY + 12} width={catW} height={15} rx="3"
              fill={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"} />
            <text x={AI_X + 21 + sevW + catW / 2} y={cY + 19.5} textAnchor="middle" dominantBaseline="middle"
              fill={c.muted} fontSize="8.5">{s.cat}</text>

            {/* title */}
            <text x={AI_X + 17} y={cY + 46} fill={c.text} fontSize="11" fontWeight="700">{s.title}</text>

            {/* description */}
            {s.desc.split(" ").reduce<string[][]>((lines, word) => {
              const last = lines[lines.length - 1];
              if (last && [...last, word].join(" ").length <= 28) last.push(word);
              else lines.push([word]);
              return lines;
            }, []).map((line, li) => (
              <text key={li} x={AI_X + 17} y={cY + 64 + li * 14} fill={c.muted} fontSize="9">{line.join(" ")}</text>
            ))}
          </motion.g>
        );
      })}
    </svg>
  );
}

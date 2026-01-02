/**
 * Rough Drawing - Creates hand-drawn/sketchy SVG paths
 */

import type { Point, Bounds } from "@/lib/canvas";

// ============================================
// Random Utilities
// ============================================

function createSeededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function getRandomOffset(roughness: number, random: () => number): number {
  return roughness * (random() - 0.5) * 2;
}

// ============================================
// Configuration
// ============================================

export interface RoughOptions {
  roughness: number;
  bowing: number;
  seed: number;
  strokeIterations: number;
}

const DEFAULT_OPTIONS: RoughOptions = {
  roughness: 1,
  bowing: 1,
  seed: 1,
  strokeIterations: 2,
};

// ============================================
// Line Path
// ============================================

export function roughLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: Partial<RoughOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const random = createSeededRandom(opts.seed);

  if (opts.roughness === 0) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  const paths: string[] = [];
  for (let i = 0; i < opts.strokeIterations; i++) {
    paths.push(generateRoughLinePath(x1, y1, x2, y2, opts, random));
  }

  return paths.join(" ");
}

function generateRoughLinePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  opts: RoughOptions,
  random: () => number
): string {
  const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  const offset = opts.roughness * (length / 200);
  const divergePoint = 0.2 + random() * 0.2;

  const startOffset = getRandomOffset(offset, random);
  const endOffset = getRandomOffset(offset, random);

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const perpAngle = angle + Math.PI / 2;

  const bowOffset = opts.bowing * opts.roughness * (length / 200) * (random() - 0.5);
  const bowX = midX + Math.cos(perpAngle) * bowOffset;
  const bowY = midY + Math.sin(perpAngle) * bowOffset;

  const cp1x = x1 + (bowX - x1) * divergePoint + getRandomOffset(offset, random);
  const cp1y = y1 + (bowY - y1) * divergePoint + getRandomOffset(offset, random);
  const cp2x = bowX + (x2 - bowX) * (1 - divergePoint) + getRandomOffset(offset, random);
  const cp2y = bowY + (y2 - bowY) * (1 - divergePoint) + getRandomOffset(offset, random);

  return `M ${x1 + startOffset} ${y1 + startOffset} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2 + endOffset} ${y2 + endOffset}`;
}

// ============================================
// Rectangle Path
// ============================================

export function roughRectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  options: Partial<RoughOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (opts.roughness === 0) {
    return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
  }

  const top = roughLine(x, y, x + width, y, opts);
  const right = roughLine(x + width, y, x + width, y + height, { ...opts, seed: opts.seed + 1 });
  const bottom = roughLine(x + width, y + height, x, y + height, { ...opts, seed: opts.seed + 2 });
  const left = roughLine(x, y + height, x, y, { ...opts, seed: opts.seed + 3 });

  return `${top} ${right} ${bottom} ${left}`;
}

// ============================================
// Ellipse Path
// ============================================

export function roughEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  options: Partial<RoughOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const random = createSeededRandom(opts.seed);

  if (opts.roughness === 0) {
    const kappa = 0.5522848;
    const ox = rx * kappa;
    const oy = ry * kappa;

    return `M ${cx - rx} ${cy}
      C ${cx - rx} ${cy - oy}, ${cx - ox} ${cy - ry}, ${cx} ${cy - ry}
      C ${cx + ox} ${cy - ry}, ${cx + rx} ${cy - oy}, ${cx + rx} ${cy}
      C ${cx + rx} ${cy + oy}, ${cx + ox} ${cy + ry}, ${cx} ${cy + ry}
      C ${cx - ox} ${cy + ry}, ${cx - rx} ${cy + oy}, ${cx - rx} ${cy} Z`;
  }

  const paths: string[] = [];
  for (let iter = 0; iter < opts.strokeIterations; iter++) {
    const points: Point[] = [];
    const segments = 32;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const noise = getRandomOffset(opts.roughness * 2, random);
      points.push({
        x: cx + (rx + noise) * Math.cos(angle),
        y: cy + (ry + noise) * Math.sin(angle),
      });
    }

    paths.push(pointsToCurvePath(points, true));
  }

  return paths.join(" ");
}

// ============================================
// Arrow Path
// ============================================

export function roughArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  arrowSize: number = 10,
  options: Partial<RoughOptions> = {}
): { line: string; arrowHead: string } {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const line = roughLine(x1, y1, x2, y2, opts);

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const arrowAngle = Math.PI / 6;

  const ax1 = x2 - arrowSize * Math.cos(angle - arrowAngle);
  const ay1 = y2 - arrowSize * Math.sin(angle - arrowAngle);
  const ax2 = x2 - arrowSize * Math.cos(angle + arrowAngle);
  const ay2 = y2 - arrowSize * Math.sin(angle + arrowAngle);

  const arrowHead = `
    ${roughLine(ax1, ay1, x2, y2, { ...opts, seed: opts.seed + 10 })}
    ${roughLine(x2, y2, ax2, ay2, { ...opts, seed: opts.seed + 11 })}
  `;

  return { line, arrowHead };
}

// ============================================
// Freedraw Path
// ============================================

export function roughFreedraw(
  points: Point[],
  options: Partial<RoughOptions> = {}
): string {
  if (points.length < 2) return "";

  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (opts.roughness === 0) {
    return smoothPath(points);
  }

  const random = createSeededRandom(opts.seed);
  const noisyPoints = points.map((p) => ({
    x: p.x + getRandomOffset(opts.roughness, random),
    y: p.y + getRandomOffset(opts.roughness, random),
  }));

  return smoothPath(noisyPoints);
}

// ============================================
// Fill Patterns
// ============================================

export function generateHachureFill(
  bounds: Bounds,
  angle: number = -45,
  gap: number = 4,
  options: Partial<RoughOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const paths: string[] = [];

  const angleRad = (angle * Math.PI) / 180;
  const tanAngle = Math.tan(angleRad);

  const diagonal = Math.sqrt(bounds.width ** 2 + bounds.height ** 2);
  const lineCount = Math.ceil(diagonal / gap);

  for (let i = -lineCount; i <= lineCount; i++) {
    const offset = i * gap;

    const x1 = bounds.x;
    const y1 = bounds.y + bounds.height / 2 + offset;
    const x2 = bounds.x + bounds.width;
    const y2 = y1 - bounds.width * tanAngle;

    const clipped = clipLineToBounds(x1, y1, x2, y2, bounds);
    if (clipped) {
      paths.push(
        roughLine(clipped.x1, clipped.y1, clipped.x2, clipped.y2, {
          ...opts,
          seed: opts.seed + i,
          strokeIterations: 1,
        })
      );
    }
  }

  return paths.join(" ");
}

export function generateCrossHatchFill(
  bounds: Bounds,
  gap: number = 4,
  options: Partial<RoughOptions> = {}
): string {
  const hachure1 = generateHachureFill(bounds, -45, gap, options);
  const hachure2 = generateHachureFill(bounds, 45, gap, { ...options, seed: (options.seed || 1) + 1000 });
  return `${hachure1} ${hachure2}`;
}

// ============================================
// Helpers
// ============================================

function pointsToCurvePath(points: Point[], closed: boolean = false): string {
  if (points.length < 2) return "";

  let path = `M ${points[0].x} ${points[0].y}`;

  if (points.length === 2) {
    path += ` L ${points[1].x} ${points[1].y}`;
    return path;
  }

  for (let i = 1; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    path += ` Q ${curr.x} ${curr.y}, ${(curr.x + next.x) / 2} ${(curr.y + next.y) / 2}`;
  }

  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;

  if (closed) path += " Z";

  return path;
}

function smoothPath(points: Point[]): string {
  if (points.length < 2) return "";

  let path = `M ${points[0].x} ${points[0].y}`;

  if (points.length === 2) {
    path += ` L ${points[1].x} ${points[1].y}`;
    return path;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

function clipLineToBounds(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bounds: Bounds
): { x1: number; y1: number; x2: number; y2: number } | null {
  const xMin = bounds.x;
  const yMin = bounds.y;
  const xMax = bounds.x + bounds.width;
  const yMax = bounds.y + bounds.height;

  if (
    (x1 < xMin && x2 < xMin) ||
    (x1 > xMax && x2 > xMax) ||
    (y1 < yMin && y2 < yMin) ||
    (y1 > yMax && y2 > yMax)
  ) {
    return null;
  }

  const clip = (x: number, y: number, dx: number, dy: number): { x: number; y: number } => {
    if (dx !== 0) {
      if (x < xMin) { y += ((xMin - x) * dy) / dx; x = xMin; }
      else if (x > xMax) { y -= ((x - xMax) * dy) / dx; x = xMax; }
    }
    if (dy !== 0) {
      if (y < yMin) { x += ((yMin - y) * dx) / dy; y = yMin; }
      else if (y > yMax) { x -= ((y - yMax) * dx) / dy; y = yMax; }
    }
    return { x, y };
  };

  const dx = x2 - x1;
  const dy = y2 - y1;

  const p1 = clip(x1, y1, dx, dy);
  const p2 = clip(x2, y2, -dx, -dy);

  if (
    p1.x < xMin - 0.1 || p1.x > xMax + 0.1 || p1.y < yMin - 0.1 || p1.y > yMax + 0.1 ||
    p2.x < xMin - 0.1 || p2.x > xMax + 0.1 || p2.y < yMin - 0.1 || p2.y > yMax + 0.1
  ) {
    return null;
  }

  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
}

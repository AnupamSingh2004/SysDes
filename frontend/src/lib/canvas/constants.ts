/**
 * Canvas Constants and Default Values
 */

import type { ShapeStyle, CanvasState, InteractionState } from "./types";

// ============================================
// Default Style
// ============================================

export const DEFAULT_STYLE: ShapeStyle = {
  strokeColor: "#ffffff",
  strokeWidth: 2,
  strokeStyle: "solid",
  fillColor: "transparent",
  fillStyle: "none",
  opacity: 1,
  roughness: 1, // 0 = smooth, 1+ = rough/hand-drawn
};

// ============================================
// Default Canvas State
// ============================================

export const DEFAULT_CANVAS_STATE: CanvasState = {
  shapes: [],
  selectedIds: [],
  scrollX: 0,
  scrollY: 0,
  zoom: 1,
  activeTool: "select",
  currentStyle: DEFAULT_STYLE,
  showGrid: true,
  snapToGrid: false,
  gridSize: 20,
};

// ============================================
// Default Interaction State
// ============================================

export const DEFAULT_INTERACTION_STATE: InteractionState = {
  mode: "idle",
  startPoint: null,
  currentPoint: null,
  dragStartPoint: null,
  dragOffset: null,
  resizeHandle: null,
  initialBounds: null,
  initialPoints: null,
  selectionBox: null,
  drawingShape: null,
  hoveredShapeId: null,
  hoveredHandle: null,
  editingTextId: null,
};

// ============================================
// Canvas Configuration
// ============================================

export const CANVAS_CONFIG = {
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 10,
  ZOOM_STEP: 0.1,
  
  // Selection
  SELECTION_PADDING: 4,
  HANDLE_SIZE: 8,
  ROTATION_HANDLE_OFFSET: 24,
  
  // Grid - Dot pattern like Excalidraw
  GRID_DOT_COLOR: "#3d3d3d",
  GRID_DOT_SIZE: 1,
  
  // Snapping
  SNAP_THRESHOLD: 8,
  
  // Performance
  MIN_SHAPE_SIZE: 2,
  DEBOUNCE_HISTORY: 300,
} as const;

// ============================================
// Color Presets
// ============================================

export const COLOR_PALETTE = [
  "#ffffff", // White
  "#f87171", // Red
  "#fb923c", // Orange
  "#facc15", // Yellow
  "#4ade80", // Green
  "#22d3ee", // Cyan
  "#60a5fa", // Blue
  "#a78bfa", // Purple
  "#f472b6", // Pink
  "#94a3b8", // Gray
] as const;

export const FILL_COLORS = [
  "transparent",
  "rgba(248, 113, 113, 0.3)",
  "rgba(251, 146, 60, 0.3)",
  "rgba(250, 204, 21, 0.3)",
  "rgba(74, 222, 128, 0.3)",
  "rgba(34, 211, 238, 0.3)",
  "rgba(96, 165, 250, 0.3)",
  "rgba(167, 139, 250, 0.3)",
  "rgba(244, 114, 182, 0.3)",
  "rgba(148, 163, 184, 0.3)",
] as const;

// ============================================
// Stroke Width Presets
// ============================================

export const STROKE_WIDTHS = [1, 2, 3, 4, 6] as const;

// ============================================
// Font Configuration
// ============================================

export const FONT_FAMILIES = [
  { name: "Hand-drawn", value: "Virgil, Segoe UI Emoji" },
  { name: "Normal", value: "Helvetica, Arial, sans-serif" },
  { name: "Code", value: "Cascadia, Fira Code, monospace" },
] as const;

export const FONT_SIZES = [16, 20, 24, 32, 48, 64] as const;

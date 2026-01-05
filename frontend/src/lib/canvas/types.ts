/**
 * Canvas Types - Inspired by Excalidraw's data model
 * All shapes are serializable to JSON for persistence
 */

// ============================================
// Base Types
// ============================================

export type Point = {
  x: number;
  y: number;
};

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// ============================================
// Shape Types
// ============================================

export type ShapeType =
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "freedraw";

export type StrokeStyle = "solid" | "dashed" | "dotted";
export type FillStyle = "solid" | "hachure" | "cross-hatch" | "none";
export type RoughStyle = "architect" | "artist" | "comic" | "none";

export type ArrowheadType = "none" | "arrow" | "triangle" | "circle" | "diamond";

// ============================================
// Base Shape Interface
// ============================================

export interface BaseShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number; // rotation in radians

  // Styling
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  fillColor: string;
  fillStyle: FillStyle;
  opacity: number;
  roughness: number; // 0 = smooth, higher = rougher hand-drawn look

  // State
  isLocked: boolean;

  // Metadata
  seed: number; // For consistent rough drawing
  createdAt: number;
  updatedAt: number;
}

// ============================================
// Specific Shape Types
// ============================================

export interface RectangleShape extends BaseShape {
  type: "rectangle";
  cornerRadius: number;
}

export interface EllipseShape extends BaseShape {
  type: "ellipse";
}

export interface LineShape extends BaseShape {
  type: "line";
  points: Point[];
  startArrowhead: ArrowheadType;
  endArrowhead: ArrowheadType;
}

export interface ArrowShape extends BaseShape {
  type: "arrow";
  points: Point[];
  startArrowhead: ArrowheadType;
  endArrowhead: ArrowheadType;
}

export interface TextShape extends BaseShape {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  textAlign: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
  lineHeight: number; // multiplier for line spacing
  autoResize: boolean; // whether to auto-resize based on content
}

export interface FreedrawShape extends BaseShape {
  type: "freedraw";
  points: Point[];
  pressures: number[];
}

// Union type for all shapes
export type Shape =
  | RectangleShape
  | EllipseShape
  | LineShape
  | ArrowShape
  | TextShape
  | FreedrawShape;

// ============================================
// Canvas State
// ============================================

export type ToolType =
  | "select"
  | "pan"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "freedraw"
  | "eraser";

export interface ShapeStyle {
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  fillColor: string;
  fillStyle: FillStyle;
  opacity: number;
  roughness: number;
}

export interface CanvasState {
  shapes: Shape[];
  selectedIds: string[];

  // Viewport
  scrollX: number;
  scrollY: number;
  zoom: number;

  // Current tool
  activeTool: ToolType;

  // Drawing style defaults
  currentStyle: ShapeStyle;

  // Grid
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

// ============================================
// History for Undo/Redo
// ============================================

export interface HistoryEntry {
  shapes: Shape[];
  timestamp: number;
}

export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
}

// ============================================
// Interaction State
// ============================================

export type InteractionMode =
  | "idle"
  | "drawing"
  | "selecting"
  | "dragging"
  | "resizing"
  | "rotating"
  | "panning"
  | "editing-text";

export type ResizeHandle =
  | "nw" | "n" | "ne"
  | "w" | "e"
  | "sw" | "s" | "se"
  | "rotation";

export interface InteractionState {
  mode: InteractionMode;

  // For drawing
  startPoint: Point | null;
  currentPoint: Point | null;

  // For dragging/selecting
  dragStartPoint: Point | null;
  dragOffset: Point | null;

  // For resizing
  resizeHandle: ResizeHandle | null;
  initialBounds: Bounds | null;
  initialPoints: Point[] | null;
  initialFontSize: number | null; // For text shapes - to scale font proportionally

  // For selection box
  selectionBox: Bounds | null;

  // Shape being drawn (preview)
  drawingShape: Shape | null;

  // Hover state
  hoveredShapeId: string | null;
  hoveredHandle: ResizeHandle | null;

  // Text editing
  editingTextId: string | null;
}

// ============================================
// Event Types
// ============================================

export interface CanvasPointerEvent {
  clientX: number;
  clientY: number;
  canvasX: number;
  canvasY: number;
  pressure: number;
  button: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

// ============================================
// Serialization Types
// ============================================

export interface CanvasDocument {
  version: number;
  shapes: Shape[];
  viewport: {
    scrollX: number;
    scrollY: number;
    zoom: number;
  };
  style: ShapeStyle;
  createdAt: number;
  updatedAt: number;
}

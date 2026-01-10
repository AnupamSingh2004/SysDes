/**
 * Canvas Utility Functions
 */

import type {
  Point,
  Bounds,
  Shape,
  RectangleShape,
  EllipseShape,
  LineShape,
  ArrowShape,
  FreedrawShape,
  TextShape,
  EraserShape,
  ShapeStyle,
  ResizeHandle,
  InternalShape,
} from "@/lib/canvas";
import { DEFAULT_STYLE, CANVAS_CONFIG } from "@/lib/canvas";

// ============================================
// ID Generation
// ============================================

export function createShapeId(): string {
  return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

// ============================================
// Bounds Calculation
// ============================================

type ShapeWithPoints = LineShape | ArrowShape | FreedrawShape | EraserShape;

export function getShapeBounds(shape: Shape | InternalShape): Bounds {
  const shapeType = shape.type;
  if (shapeType === "line" || shapeType === "arrow" || shapeType === "freedraw" || shapeType === "eraser") {
    const shapeWithPoints = shape as ShapeWithPoints;
    const points = shapeWithPoints.points;
    if (!points || points.length === 0) {
      return { x: shape.x, y: shape.y, width: 0, height: 0 };
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return {
      x: shape.x + minX,
      y: shape.y + minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  return {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
  };
}

export function expandBounds(bounds: Bounds, padding: number): Bounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

// ============================================
// Geometry Utilities
// ============================================

export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function midpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

export function isPointInBounds(point: Point, bounds: Bounds, padding = 0): boolean {
  return (
    point.x >= bounds.x - padding &&
    point.x <= bounds.x + bounds.width + padding &&
    point.y >= bounds.y - padding &&
    point.y <= bounds.y + bounds.height + padding
  );
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

// ============================================
// Hit Testing
// ============================================

export function isPointInShape(point: Point, shape: Shape): boolean {
  const bounds = getShapeBounds(shape);

  if (!isPointInBounds(point, expandBounds(bounds, shape.strokeWidth / 2))) {
    return false;
  }

  switch (shape.type) {
    case "rectangle":
      return isPointInRectangle(point, shape);
    case "ellipse":
      return isPointInEllipse(point, shape);
    case "line":
    case "arrow":
      return isPointNearLine(point, shape);
    case "freedraw":
      return isPointNearFreedraw(point, shape);
    case "text":
      return isPointInText(point, shape);
    default:
      return isPointInBounds(point, bounds);
  }
}

// For text shapes, use a tighter hit area based on actual text content
function isPointInText(point: Point, shape: TextShape): boolean {
  // If text is empty, use the placeholder bounds
  if (!shape.text) {
    return isPointInBounds(point, { x: shape.x, y: shape.y, width: shape.width, height: shape.height });
  }
  
  // Calculate actual text bounds based on content
  // Use a smaller hit area - only the text content area, not the full bounding box
  const padding = 4; // Small padding around text
  const textBounds = {
    x: shape.x - padding,
    y: shape.y - padding,
    width: shape.width + padding * 2,
    height: shape.height + padding * 2,
  };
  
  return isPointInBounds(point, textBounds);
}

function isPointInRectangle(point: Point, shape: RectangleShape): boolean {
  if (shape.angle !== 0) {
    const center = { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
    point = rotatePoint(point, center, -shape.angle);
  }

  const halfStroke = shape.strokeWidth / 2;
  const threshold = Math.max(shape.strokeWidth, 8); // Minimum hit area
  
  // Check if point is within outer bounds (including stroke)
  const inOuterBounds = (
    point.x >= shape.x - halfStroke &&
    point.x <= shape.x + shape.width + halfStroke &&
    point.y >= shape.y - halfStroke &&
    point.y <= shape.y + shape.height + halfStroke
  );
  
  if (!inOuterBounds) return false;
  
  // If shape has no fill or transparent fill, only hit-test the stroke/border area
  const hasNoFill = shape.fillStyle === "none" || 
                    shape.fillColor === "transparent" || 
                    shape.fillColor === "rgba(0,0,0,0)" ||
                    shape.fillColor === "";
  
  if (hasNoFill) {
    // Check if point is within inner bounds (inside the stroke)
    const inInnerBounds = (
      point.x > shape.x + threshold &&
      point.x < shape.x + shape.width - threshold &&
      point.y > shape.y + threshold &&
      point.y < shape.y + shape.height - threshold
    );
    // If inside inner bounds, not on the stroke
    return !inInnerBounds;
  }
  
  // Shape has fill, hit anywhere inside
  return true;
}

function isPointInEllipse(point: Point, shape: EllipseShape): boolean {
  const cx = shape.x + shape.width / 2;
  const cy = shape.y + shape.height / 2;
  const rx = shape.width / 2 + shape.strokeWidth / 2;
  const ry = shape.height / 2 + shape.strokeWidth / 2;

  if (shape.angle !== 0) {
    point = rotatePoint(point, { x: cx, y: cy }, -shape.angle);
  }

  const dx = point.x - cx;
  const dy = point.y - cy;
  const normalizedDist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  
  // Check if point is within outer ellipse
  if (normalizedDist > 1) return false;
  
  // If shape has no fill or transparent fill, only hit-test the stroke/border area
  const hasNoFill = shape.fillStyle === "none" || 
                    shape.fillColor === "transparent" || 
                    shape.fillColor === "rgba(0,0,0,0)" ||
                    shape.fillColor === "";
  
  if (hasNoFill) {
    const threshold = Math.max(shape.strokeWidth, 8);
    const innerRx = Math.max(0, shape.width / 2 - threshold);
    const innerRy = Math.max(0, shape.height / 2 - threshold);
    
    if (innerRx > 0 && innerRy > 0) {
      const innerNormalizedDist = (dx * dx) / (innerRx * innerRx) + (dy * dy) / (innerRy * innerRy);
      // If inside inner ellipse, not on the stroke
      return innerNormalizedDist >= 1;
    }
  }
  
  // Shape has fill, hit anywhere inside
  return true;
}

function isPointNearLine(point: Point, shape: LineShape | ArrowShape): boolean {
  const threshold = Math.max(shape.strokeWidth, 10);

  for (let i = 0; i < shape.points.length - 1; i++) {
    const p1 = { x: shape.x + shape.points[i].x, y: shape.y + shape.points[i].y };
    const p2 = { x: shape.x + shape.points[i + 1].x, y: shape.y + shape.points[i + 1].y };

    if (distanceToLineSegment(point, p1, p2) <= threshold) {
      return true;
    }
  }

  return false;
}

function isPointNearFreedraw(point: Point, shape: FreedrawShape): boolean {
  const threshold = Math.max(shape.strokeWidth, 10);

  for (let i = 0; i < shape.points.length - 1; i++) {
    const p1 = { x: shape.x + shape.points[i].x, y: shape.y + shape.points[i].y };
    const p2 = { x: shape.x + shape.points[i + 1].x, y: shape.y + shape.points[i + 1].y };

    if (distanceToLineSegment(point, p1, p2) <= threshold) {
      return true;
    }
  }

  return false;
}

function distanceToLineSegment(point: Point, p1: Point, p2: Point): number {
  const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
  if (l2 === 0) return distance(point, p1);

  let t = ((point.x - p1.x) * (p2.x - p1.x) + (point.y - p1.y) * (p2.y - p1.y)) / l2;
  t = Math.max(0, Math.min(1, t));

  return distance(point, {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  });
}

// ============================================
// Resize Handle Detection
// ============================================

export function getResizeHandleAtPoint(
  point: Point,
  bounds: Bounds,
  handleSize: number = CANVAS_CONFIG.HANDLE_SIZE,
  zoom: number = 1
): ResizeHandle | null {
  const handles: { handle: ResizeHandle; x: number; y: number }[] = [
    { handle: "nw", x: bounds.x, y: bounds.y },
    { handle: "n", x: bounds.x + bounds.width / 2, y: bounds.y },
    { handle: "ne", x: bounds.x + bounds.width, y: bounds.y },
    { handle: "w", x: bounds.x, y: bounds.y + bounds.height / 2 },
    { handle: "e", x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
    { handle: "sw", x: bounds.x, y: bounds.y + bounds.height },
    { handle: "s", x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
    { handle: "se", x: bounds.x + bounds.width, y: bounds.y + bounds.height },
  ];

  // Adjust threshold based on zoom - larger threshold at lower zoom levels
  const threshold = handleSize / zoom;

  for (const { handle, x, y } of handles) {
    if (Math.abs(point.x - x) <= threshold && Math.abs(point.y - y) <= threshold) {
      return handle;
    }
  }

  return null;
}

export function getCursorForHandle(handle: ResizeHandle | null): string {
  if (!handle) return "default";

  const cursors: Record<ResizeHandle, string> = {
    nw: "nwse-resize",
    n: "ns-resize",
    ne: "nesw-resize",
    w: "ew-resize",
    e: "ew-resize",
    sw: "nesw-resize",
    s: "ns-resize",
    se: "nwse-resize",
    rotation: "grab",
  };

  return cursors[handle];
}

// ============================================
// Shape Factory
// ============================================

export function createShape<T extends Shape["type"]>(
  type: T,
  x: number,
  y: number,
  style: Partial<ShapeStyle> = {}
): Extract<Shape, { type: T }> {
  const now = Date.now();
  const mergedStyle = { ...DEFAULT_STYLE, ...style };

  const baseShape = {
    id: createShapeId(),
    x,
    y,
    width: 0,
    height: 0,
    angle: 0,
    strokeColor: mergedStyle.strokeColor,
    strokeWidth: mergedStyle.strokeWidth,
    strokeStyle: mergedStyle.strokeStyle,
    fillColor: mergedStyle.fillColor,
    fillStyle: mergedStyle.fillStyle,
    opacity: mergedStyle.opacity,
    roughness: mergedStyle.roughness,
    isLocked: false,
    seed: generateSeed(),
    createdAt: now,
    updatedAt: now,
  };

  switch (type) {
    case "rectangle":
      return { ...baseShape, type: "rectangle", cornerRadius: 0 } as unknown as Extract<Shape, { type: T }>;
    case "ellipse":
      return { ...baseShape, type: "ellipse" } as unknown as Extract<Shape, { type: T }>;
    case "line":
      return { ...baseShape, type: "line", points: [], startArrowhead: "none", endArrowhead: "none" } as unknown as Extract<Shape, { type: T }>;
    case "arrow":
      return { ...baseShape, type: "arrow", points: [], startArrowhead: "none", endArrowhead: "arrow" } as unknown as Extract<Shape, { type: T }>;
    case "text":
      return { ...baseShape, type: "text", text: "", fontSize: 20, fontFamily: "Virgil, Segoe UI Emoji", textAlign: "center", verticalAlign: "middle" } as unknown as Extract<Shape, { type: T }>;
    case "freedraw":
      return { ...baseShape, type: "freedraw", points: [], pressures: [] } as unknown as Extract<Shape, { type: T }>;
    default:
      throw new Error(`Unknown shape type: ${type}`);
  }
}

// ============================================
// Coordinate Transforms
// ============================================

export function screenToCanvas(
  screenX: number,
  screenY: number,
  scrollX: number,
  scrollY: number,
  zoom: number,
  canvasRect: DOMRect
): Point {
  return {
    x: (screenX - canvasRect.left) / zoom - scrollX,
    y: (screenY - canvasRect.top) / zoom - scrollY,
  };
}

export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  scrollX: number,
  scrollY: number,
  zoom: number
): Point {
  return {
    x: (canvasX + scrollX) * zoom,
    y: (canvasY + scrollY) * zoom,
  };
}

// ============================================
// Snapping
// ============================================

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPointToGrid(point: Point, gridSize: number): Point {
  return {
    x: snapToGrid(point.x, gridSize),
    y: snapToGrid(point.y, gridSize),
  };
}

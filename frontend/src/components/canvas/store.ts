/**
 * Canvas Store - Zustand state management (without immer for performance)
 */

import { create } from "zustand";
import type {
  Shape,
  TextShape,
  CanvasState,
  InteractionState,
  ToolType,
  ShapeStyle,
  HistoryEntry,
  Point,
  Bounds,
  ResizeHandle,
  InternalShape,
  EraserShape,
} from "@/lib/canvas";
import { DEFAULT_CANVAS_STATE, DEFAULT_INTERACTION_STATE, CANVAS_CONFIG } from "@/lib/canvas";
import { getShapeBounds, isPointInShape, snapPointToGrid, createShapeId, generateSeed } from "./utils";

// ============================================
// Utilities
// ============================================

// Measure text dimensions for text shapes
function measureTextForStore(
  text: string,
  fontSize: number,
  fontFamily: string,
  lineHeight: number = 1.25
): { width: number; height: number } {
  if (typeof document === "undefined") {
    // SSR fallback
    return { width: 100, height: fontSize * lineHeight };
  }
  
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { width: 100, height: fontSize * lineHeight };
  
  ctx.font = `${fontSize}px ${fontFamily}`;
  
  const lines = text.split("\n");
  let maxWidth = 0;
  
  for (const line of lines) {
    const metrics = ctx.measureText(line || " ");
    maxWidth = Math.max(maxWidth, metrics.width);
  }
  
  const height = lines.length * fontSize * lineHeight;
  
  return {
    width: Math.max(maxWidth + 8, 50), // Add padding, min width of 50
    height: Math.max(height, fontSize * lineHeight),
  };
}

// Fast deep clone for shapes (avoids JSON.parse/stringify overhead)
function cloneShape(shape: Shape): Shape {
  const clone = { ...shape };
  if ("points" in shape && Array.isArray(shape.points)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (clone as any).points = shape.points.map((p: Point) => ({ ...p }));
  }
  if ("pressures" in shape && Array.isArray(shape.pressures)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (clone as any).pressures = [...shape.pressures];
  }
  return clone;
}

function cloneShapes(shapes: Shape[]): Shape[] {
  return shapes.map(cloneShape);
}

// ============================================
// Store Types
// ============================================

interface CanvasStore {
  // State
  canvas: CanvasState;
  interaction: InteractionState;
  history: HistoryEntry[];
  historyIndex: number;
  clipboard: Shape[];
  clipboardOffset: number;

  // Canvas Actions
  setTool: (tool: ToolType) => void;
  setStyle: (style: Partial<ShapeStyle>) => void;
  setZoom: (zoom: number) => void;
  setScroll: (scrollX: number, scrollY: number) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;

  // Shape Actions
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShapes: (ids: string[]) => void;
  duplicateShapes: (ids: string[]) => void;
  bringToFront: (ids: string[]) => void;
  sendToBack: (ids: string[]) => void;

  // Selection
  selectShape: (id: string, addToSelection?: boolean) => void;
  selectShapes: (ids: string[]) => void;
  selectAll: () => void;
  deselectAll: () => void;
  deleteSelected: () => void;

  // Clipboard
  copySelected: () => void;
  cutSelected: () => void;
  paste: (position?: Point) => void;

  // Interactions
  startDrawing: (point: Point) => void;
  updateDrawing: (point: Point, shiftKey?: boolean) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;

  startDragging: (point: Point) => void;
  updateDragging: (point: Point) => void;
  finishDragging: () => void;

  startResizing: (handle: ResizeHandle, point: Point) => void;
  updateResizing: (point: Point, shiftKey?: boolean, lineEndpoint?: "start" | "end" | null) => void;
  finishResizing: () => void;

  startPanning: (point: Point) => void;
  updatePanning: (point: Point) => void;
  finishPanning: () => void;

  startSelectionBox: (point: Point) => void;
  updateSelectionBox: (point: Point) => void;
  finishSelectionBox: () => void;

  setHoveredShape: (id: string | null) => void;
  setHoveredHandle: (handle: ResizeHandle | null) => void;

  // Text editing
  startTextEditing: (id: string) => void;
  finishTextEditing: (text: string, newWidth?: number, newHeight?: number) => void;
  cancelTextEditing: () => void;
  createTextShape: (point: Point) => void;

  // History
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;

  // Utility
  getShapeAtPoint: (point: Point) => Shape | null;
  getSelectedShapes: () => Shape[];
  getSelectionBounds: () => Bounds | null;
  loadDocument: (shapes: Shape[]) => void;
  reset: () => void;
}

// ============================================
// Store Implementation
// ============================================

export const useCanvasStore = create<CanvasStore>()((set, get) => ({
  canvas: DEFAULT_CANVAS_STATE,
  interaction: DEFAULT_INTERACTION_STATE,
  clipboard: [],
  clipboardOffset: 0,
  history: [],
  historyIndex: -1,

  // ============================================
  // Canvas Actions
  // ============================================

  setTool: (tool) => {
    set({
      canvas: { ...get().canvas, activeTool: tool },
      interaction: { ...DEFAULT_INTERACTION_STATE },
    });
  },

  setStyle: (style) => {
    const state = get();
    const newCurrentStyle = { ...state.canvas.currentStyle, ...style };
    const selectedIds = state.canvas.selectedIds;

    if (selectedIds.length > 0) {
      const newShapes = state.canvas.shapes.map((shape) => {
        if (selectedIds.includes(shape.id)) {
          return { ...shape, ...style, updatedAt: Date.now() };
        }
        return shape;
      });
      set({
        canvas: {
          ...state.canvas,
          currentStyle: newCurrentStyle,
          shapes: newShapes,
        },
      });
    } else {
      set({
        canvas: { ...state.canvas, currentStyle: newCurrentStyle },
      });
    }
  },

  setZoom: (zoom) => {
    const clampedZoom = Math.max(CANVAS_CONFIG.MIN_ZOOM, Math.min(CANVAS_CONFIG.MAX_ZOOM, zoom));
    set({ canvas: { ...get().canvas, zoom: clampedZoom } });
  },

  setScroll: (scrollX, scrollY) => {
    set({ canvas: { ...get().canvas, scrollX, scrollY } });
  },

  toggleGrid: () => {
    const canvas = get().canvas;
    set({ canvas: { ...canvas, showGrid: !canvas.showGrid } });
  },

  toggleSnapToGrid: () => {
    const canvas = get().canvas;
    set({ canvas: { ...canvas, snapToGrid: !canvas.snapToGrid } });
  },

  // ============================================
  // Shape Actions
  // ============================================

  addShape: (shape) => {
    const canvas = get().canvas;
    set({ canvas: { ...canvas, shapes: [...canvas.shapes, shape] } });
    get().saveToHistory();
  },

  updateShape: (id, updates) => {
    const canvas = get().canvas;
    const newShapes = canvas.shapes.map((s) => {
      if (s.id === id) {
        return { ...s, ...updates, updatedAt: Date.now() } as Shape;
      }
      return s;
    });
    set({ canvas: { ...canvas, shapes: newShapes } });
  },

  deleteShapes: (ids) => {
    const canvas = get().canvas;
    set({
      canvas: {
        ...canvas,
        shapes: canvas.shapes.filter((s) => !ids.includes(s.id)),
        selectedIds: canvas.selectedIds.filter((id) => !ids.includes(id)),
      },
    });
    get().saveToHistory();
  },

  duplicateShapes: (ids) => {
    const shapes = get().canvas.shapes.filter((s) => ids.includes(s.id));
    const now = Date.now();
    const duplicates = shapes.map((shape) => ({
      ...cloneShape(shape),
      id: createShapeId(),
      x: shape.x + 20,
      y: shape.y + 20,
      createdAt: now,
      updatedAt: now,
    })) as Shape[];

    const canvas = get().canvas;
    set({
      canvas: {
        ...canvas,
        shapes: [...canvas.shapes, ...duplicates],
        selectedIds: duplicates.map((s) => s.id),
      },
    });
    get().saveToHistory();
  },

  bringToFront: (ids) => {
    const canvas = get().canvas;
    const toMove = canvas.shapes.filter((s) => ids.includes(s.id));
    const rest = canvas.shapes.filter((s) => !ids.includes(s.id));
    set({ canvas: { ...canvas, shapes: [...rest, ...toMove] } });
    get().saveToHistory();
  },

  sendToBack: (ids) => {
    const canvas = get().canvas;
    const toMove = canvas.shapes.filter((s) => ids.includes(s.id));
    const rest = canvas.shapes.filter((s) => !ids.includes(s.id));
    set({ canvas: { ...canvas, shapes: [...toMove, ...rest] } });
    get().saveToHistory();
  },

  // ============================================
  // Selection
  // ============================================

  selectShape: (id, addToSelection = false) => {
    const canvas = get().canvas;
    let newSelectedIds: string[];

    if (addToSelection) {
      if (canvas.selectedIds.includes(id)) {
        newSelectedIds = canvas.selectedIds.filter((i) => i !== id);
      } else {
        newSelectedIds = [...canvas.selectedIds, id];
      }
    } else {
      newSelectedIds = [id];
    }

    set({ canvas: { ...canvas, selectedIds: newSelectedIds } });
  },

  selectShapes: (ids) => {
    set({ canvas: { ...get().canvas, selectedIds: ids } });
  },

  selectAll: () => {
    const canvas = get().canvas;
    set({ canvas: { ...canvas, selectedIds: canvas.shapes.map((s) => s.id) } });
  },

  deselectAll: () => {
    set({ canvas: { ...get().canvas, selectedIds: [] } });
  },

  deleteSelected: () => {
    const ids = get().canvas.selectedIds;
    if (ids.length > 0) {
      get().deleteShapes(ids);
    }
  },

  // ============================================
  // Clipboard
  // ============================================

  copySelected: () => {
    const selectedShapes = get().getSelectedShapes();
    if (selectedShapes.length === 0) return;
    const clonedShapes = cloneShapes(selectedShapes);
    set({ clipboard: clonedShapes, clipboardOffset: 0 });
  },

  cutSelected: () => {
    const selectedShapes = get().getSelectedShapes();
    if (selectedShapes.length === 0) return;
    const clonedShapes = cloneShapes(selectedShapes);
    set({ clipboard: clonedShapes, clipboardOffset: 0 });
    get().deleteSelected();
  },

  paste: (position) => {
    const clipboard = get().clipboard;
    if (clipboard.length === 0) return;

    const currentOffset = get().clipboardOffset + 20;
    set({ clipboardOffset: currentOffset });

    // Calculate the center of copied shapes
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const shape of clipboard) {
      minX = Math.min(minX, shape.x);
      minY = Math.min(minY, shape.y);
      maxX = Math.max(maxX, shape.x + shape.width);
      maxY = Math.max(maxY, shape.y + shape.height);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const now = Date.now();
    const newShapes: Shape[] = clipboard.map((shape) => {
      let offsetX: number, offsetY: number;

      if (position) {
        offsetX = position.x - centerX;
        offsetY = position.y - centerY;
      } else {
        offsetX = currentOffset;
        offsetY = currentOffset;
      }

      return {
        ...cloneShape(shape),
        id: createShapeId(),
        x: shape.x + offsetX,
        y: shape.y + offsetY,
        seed: generateSeed(),
        createdAt: now,
        updatedAt: now,
      } as Shape;
    });

    const canvas = get().canvas;
    set({
      canvas: {
        ...canvas,
        shapes: [...canvas.shapes, ...newShapes],
        selectedIds: newShapes.map((s) => s.id),
      },
    });
    get().saveToHistory();
  },

  // ============================================
  // Drawing
  // ============================================

  startDrawing: (point) => {
    const { canvas } = get();
    const { activeTool, currentStyle } = canvas;

    const now = Date.now();
    const baseShape = {
      id: `preview-${now}`,
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
      angle: 0,
      strokeColor: currentStyle.strokeColor,
      strokeWidth: currentStyle.strokeWidth,
      strokeStyle: currentStyle.strokeStyle,
      fillColor: currentStyle.fillColor,
      fillStyle: currentStyle.fillStyle,
      opacity: currentStyle.opacity,
      roughness: currentStyle.roughness,
      isLocked: false,
      seed: generateSeed(),
      createdAt: now,
      updatedAt: now,
    };

    let drawingShape: InternalShape | null = null;

    switch (activeTool) {
      case "rectangle":
        drawingShape = { ...baseShape, type: "rectangle", cornerRadius: 0 } as Shape;
        break;
      case "ellipse":
        drawingShape = { ...baseShape, type: "ellipse" } as Shape;
        break;
      case "line":
        drawingShape = {
          ...baseShape,
          type: "line",
          points: [{ x: 0, y: 0 }],
          startArrowhead: "none",
          endArrowhead: "none",
        } as Shape;
        break;
      case "arrow":
        drawingShape = {
          ...baseShape,
          type: "arrow",
          points: [{ x: 0, y: 0 }],
          startArrowhead: "none",
          endArrowhead: "arrow",
        } as Shape;
        break;
      case "freedraw":
        drawingShape = {
          ...baseShape,
          type: "freedraw",
          points: [{ x: 0, y: 0 }],
          pressures: [0.5],
        } as Shape;
        break;
      case "eraser":
        // Eraser doesn't create a shape, it removes shapes
        drawingShape = {
          ...baseShape,
          type: "eraser",
          points: [{ x: 0, y: 0 }],
          pressures: [0.5],
        } as EraserShape;
        break;
    }

    set({
      interaction: {
        ...DEFAULT_INTERACTION_STATE,
        mode: "drawing",
        startPoint: point,
        currentPoint: point,
        drawingShape,
      },
    });
  },

  updateDrawing: (point, shiftKey = false) => {
    const state = get();
    if (state.interaction.mode !== "drawing" || !state.interaction.startPoint) return;

    const { canvas, interaction } = state;
    let targetPoint = point;

    if (canvas.snapToGrid) {
      targetPoint = snapPointToGrid(point, canvas.gridSize);
    }

    // We've already checked this above, so it's guaranteed to be non-null
    const startPoint = interaction.startPoint!;

    if (shiftKey && startPoint) {
      const dx = targetPoint.x - startPoint.x;
      const dy = targetPoint.y - startPoint.y;
      const size = Math.max(Math.abs(dx), Math.abs(dy));
      targetPoint = {
        x: startPoint.x + size * Math.sign(dx),
        y: startPoint.y + size * Math.sign(dy),
      };
    }

    if (!interaction.drawingShape) {
      set({
        interaction: { ...interaction, currentPoint: targetPoint },
      });
      return;
    }

    const shape = interaction.drawingShape;
    const minX = Math.min(startPoint.x, targetPoint.x);
    const minY = Math.min(startPoint.y, targetPoint.y);
    const width = Math.abs(targetPoint.x - startPoint.x);
    const height = Math.abs(targetPoint.y - startPoint.y);

    let updatedShape: InternalShape;

    switch (shape.type) {
      case "rectangle":
      case "ellipse":
        updatedShape = {
          ...shape,
          x: minX,
          y: minY,
          width,
          height,
          updatedAt: Date.now(),
        };
        break;
      case "line":
      case "arrow":
        updatedShape = {
          ...shape,
          x: startPoint.x,
          y: startPoint.y,
          points: [
            { x: 0, y: 0 },
            { x: targetPoint.x - startPoint.x, y: targetPoint.y - startPoint.y },
          ],
          width,
          height,
          updatedAt: Date.now(),
        };
        break;
      case "freedraw": {
        const lastPoint = shape.points[shape.points.length - 1];
        const dx = targetPoint.x - startPoint.x - lastPoint.x;
        const dy = targetPoint.y - startPoint.y - lastPoint.y;

        let newPoints = shape.points;
        let newPressures = shape.pressures;

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          newPoints = [
            ...shape.points,
            { x: targetPoint.x - startPoint.x, y: targetPoint.y - startPoint.y },
          ];
          newPressures = [...shape.pressures, 0.5];
        }

        const xs = newPoints.map((p) => p.x);
        const ys = newPoints.map((p) => p.y);
        const pathMinX = Math.min(...xs);
        const pathMinY = Math.min(...ys);
        const pathMaxX = Math.max(...xs);
        const pathMaxY = Math.max(...ys);

        updatedShape = {
          ...shape,
          points: newPoints,
          pressures: newPressures,
          width: pathMaxX - pathMinX,
          height: pathMaxY - pathMinY,
          updatedAt: Date.now(),
        };
        break;
      }
      case "eraser": {
        // For eraser, accumulate points and remove shapes that intersect with the eraser path
        const eraserShape = shape as EraserShape;
        const lastPoint = eraserShape.points[eraserShape.points.length - 1];
        const dx = targetPoint.x - startPoint.x - lastPoint.x;
        const dy = targetPoint.y - startPoint.y - lastPoint.y;

        let newPoints = eraserShape.points;
        let newPressures = eraserShape.pressures;

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          newPoints = [
            ...eraserShape.points,
            { x: targetPoint.x - startPoint.x, y: targetPoint.y - startPoint.y },
          ];
          newPressures = [...eraserShape.pressures, 0.5];

          // Eraser world point
          const worldPoint = {
            x: targetPoint.x,
            y: targetPoint.y,
          };

          // Find shapes to erase using isPointInShape for precise hit testing
          const eraserRadius = Math.max(canvas.currentStyle.strokeWidth * 3, 15); // Eraser size
          const shapesToKeep = canvas.shapes.filter((s) => {
            // Check if the eraser point is inside or near the shape
            if (isPointInShape(worldPoint, s)) {
              return false; // Remove this shape
            }
            
            // Also check with expanded bounds for near-misses
            const bounds = getShapeBounds(s);
            const expandedBounds = {
              x: bounds.x - eraserRadius,
              y: bounds.y - eraserRadius,
              width: bounds.width + eraserRadius * 2,
              height: bounds.height + eraserRadius * 2,
            };
            
            // Check if point is within expanded bounds and close to shape
            if (
              worldPoint.x >= expandedBounds.x &&
              worldPoint.x <= expandedBounds.x + expandedBounds.width &&
              worldPoint.y >= expandedBounds.y &&
              worldPoint.y <= expandedBounds.y + expandedBounds.height
            ) {
              // For freedraw, check distance to path segments
              if (s.type === "freedraw" || s.type === "line" || s.type === "arrow") {
                for (let i = 0; i < s.points.length - 1; i++) {
                  const p1 = { x: s.x + s.points[i].x, y: s.y + s.points[i].y };
                  const p2 = { x: s.x + s.points[i + 1].x, y: s.y + s.points[i + 1].y };
                  
                  // Calculate distance to line segment
                  const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
                  if (l2 === 0) {
                    if (Math.sqrt((worldPoint.x - p1.x) ** 2 + (worldPoint.y - p1.y) ** 2) < eraserRadius) {
                      return false;
                    }
                    continue;
                  }
                  
                  let t = ((worldPoint.x - p1.x) * (p2.x - p1.x) + (worldPoint.y - p1.y) * (p2.y - p1.y)) / l2;
                  t = Math.max(0, Math.min(1, t));
                  
                  const dist = Math.sqrt(
                    (worldPoint.x - (p1.x + t * (p2.x - p1.x))) ** 2 +
                    (worldPoint.y - (p1.y + t * (p2.y - p1.y))) ** 2
                  );
                  
                  if (dist < eraserRadius) {
                    return false; // Remove this shape
                  }
                }
              }
            }
            
            return true; // Keep the shape
          });

          // Update shapes immediately (erase as we go)
          if (shapesToKeep.length !== canvas.shapes.length) {
            set({
              canvas: {
                ...canvas,
                shapes: shapesToKeep,
              },
            });
          }
        }

        const xs = newPoints.map((p: Point) => p.x);
        const ys = newPoints.map((p: Point) => p.y);
        const pathMinX = Math.min(...xs);
        const pathMinY = Math.min(...ys);
        const pathMaxX = Math.max(...xs);
        const pathMaxY = Math.max(...ys);

        updatedShape = {
          ...eraserShape,
          points: newPoints,
          pressures: newPressures,
          width: pathMaxX - pathMinX,
          height: pathMaxY - pathMinY,
          updatedAt: Date.now(),
        } as EraserShape;
        break;
      }
      default:
        updatedShape = shape;
    }

    set({
      interaction: {
        ...interaction,
        currentPoint: targetPoint,
        drawingShape: updatedShape,
      },
    });
  },

  finishDrawing: () => {
    const { interaction, canvas } = get();
    const drawingShape = interaction.drawingShape;

    if (drawingShape) {
      // Don't add eraser shapes to the canvas, but save history if shapes were erased
      if (drawingShape.type === "eraser") {
        set({
          interaction: DEFAULT_INTERACTION_STATE,
        });
        // Save to history so erasing can be undone
        get().saveToHistory();
        return;
      }

      const isValidSize =
        drawingShape.width >= CANVAS_CONFIG.MIN_SHAPE_SIZE ||
        drawingShape.height >= CANVAS_CONFIG.MIN_SHAPE_SIZE ||
        (drawingShape.type === "freedraw" && drawingShape.points.length > 2);

      if (isValidSize) {
        const finalShape = {
          ...drawingShape,
          id: createShapeId(),
        };

        set({
          canvas: {
            ...canvas,
            shapes: [...canvas.shapes, finalShape as Shape],
            selectedIds: [finalShape.id],
          },
          interaction: { ...DEFAULT_INTERACTION_STATE },
        });
        get().saveToHistory();
        return;
      }
    }

    set({ interaction: { ...DEFAULT_INTERACTION_STATE } });
  },

  cancelDrawing: () => {
    set({ interaction: { ...DEFAULT_INTERACTION_STATE } });
  },

  // ============================================
  // Dragging
  // ============================================

  startDragging: (point) => {
    set({
      interaction: {
        ...get().interaction,
        mode: "dragging",
        dragStartPoint: point,
        dragOffset: { x: 0, y: 0 },
      },
    });
  },

  updateDragging: (point) => {
    const state = get();
    if (state.interaction.mode !== "dragging" || !state.interaction.dragStartPoint) return;

    const { canvas, interaction } = state;
    const dragStart = interaction.dragStartPoint!;
    const dx = point.x - dragStart.x;
    const dy = point.y - dragStart.y;
    const prevOffset = interaction.dragOffset || { x: 0, y: 0 };

    const selectedIds = canvas.selectedIds;
    const newShapes = canvas.shapes.map((shape) => {
      if (selectedIds.includes(shape.id)) {
        return {
          ...shape,
          x: shape.x + (dx - prevOffset.x),
          y: shape.y + (dy - prevOffset.y),
          updatedAt: Date.now(),
        };
      }
      return shape;
    });

    set({
      canvas: { ...canvas, shapes: newShapes },
      interaction: { ...interaction, dragOffset: { x: dx, y: dy } },
    });
  },

  finishDragging: () => {
    set({ interaction: { ...DEFAULT_INTERACTION_STATE } });
    get().saveToHistory();
  },

  // ============================================
  // Resizing
  // ============================================

  startResizing: (handle, point) => {
    const selectedShapes = get().getSelectedShapes();
    if (selectedShapes.length !== 1) return;

    const shape = selectedShapes[0];
    const initialPoints =
      "points" in shape && Array.isArray(shape.points)
        ? shape.points.map((p) => ({ x: p.x, y: p.y }))
        : null;

    // Capture initial font size for text shapes
    const initialFontSize = shape.type === "text" ? shape.fontSize : null;

    set({
      interaction: {
        ...get().interaction,
        mode: "resizing",
        resizeHandle: handle,
        dragStartPoint: point,
        initialBounds: {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
        },
        initialPoints,
        initialFontSize,
      },
    });
  },

  updateResizing: (point, shiftKey = false, lineEndpoint = null) => {
    const state = get();
    const { interaction, canvas } = state;

    if (
      interaction.mode !== "resizing" ||
      !interaction.resizeHandle ||
      !interaction.dragStartPoint ||
      !interaction.initialBounds
    ) {
      return;
    }

    const selectedIds = canvas.selectedIds;
    if (selectedIds.length !== 1) return;

    const shapeIndex = canvas.shapes.findIndex((s) => s.id === selectedIds[0]);
    if (shapeIndex === -1) return;

    const currentShape = canvas.shapes[shapeIndex];
    
    // Handle line/arrow endpoint dragging
    if ((currentShape.type === "line" || currentShape.type === "arrow") && lineEndpoint && "points" in currentShape) {
      const initialPoints = interaction.initialPoints;
      if (!initialPoints || initialPoints.length < 2) return;
      
      const initial = interaction.initialBounds;
      let newPoints: Point[];
      let newX = initial.x;
      let newY = initial.y;
      
      if (lineEndpoint === "start") {
        // Move start point - the shape position changes
        newX = point.x;
        newY = point.y;
        // Recalculate points relative to new origin
        const endWorldX = initial.x + initialPoints[initialPoints.length - 1].x;
        const endWorldY = initial.y + initialPoints[initialPoints.length - 1].y;
        newPoints = [
          { x: 0, y: 0 }, // Start at origin
          { x: endWorldX - newX, y: endWorldY - newY }, // End relative to new origin
        ];
      } else {
        // Move end point - shape position stays, just update endpoint
        newPoints = [
          { x: 0, y: 0 }, // Start at origin
          { x: point.x - initial.x, y: point.y - initial.y }, // New end point relative to origin
        ];
      }
      
      // Calculate new bounds from points
      const xs = newPoints.map(p => p.x);
      const ys = newPoints.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      
      const updatedShape = {
        ...currentShape,
        x: newX + minX,
        y: newY + minY,
        width: maxX - minX,
        height: maxY - minY,
        points: newPoints.map(p => ({ x: p.x - minX, y: p.y - minY })),
        updatedAt: Date.now(),
      };
      
      const newShapes = [...canvas.shapes];
      newShapes[shapeIndex] = updatedShape;
      set({ canvas: { ...canvas, shapes: newShapes } });
      return;
    }

    const dx = point.x - interaction.dragStartPoint.x;
    const dy = point.y - interaction.dragStartPoint.y;

    const initial = interaction.initialBounds;
    let { x, y, width, height } = initial;

    const handle = interaction.resizeHandle;
    switch (handle) {
      case "nw":
        x = initial.x + dx;
        y = initial.y + dy;
        width = initial.width - dx;
        height = initial.height - dy;
        break;
      case "n":
        y = initial.y + dy;
        height = initial.height - dy;
        break;
      case "ne":
        y = initial.y + dy;
        width = initial.width + dx;
        height = initial.height - dy;
        break;
      case "w":
        x = initial.x + dx;
        width = initial.width - dx;
        break;
      case "e":
        width = initial.width + dx;
        break;
      case "sw":
        x = initial.x + dx;
        width = initial.width - dx;
        height = initial.height + dy;
        break;
      case "s":
        height = initial.height + dy;
        break;
      case "se":
        width = initial.width + dx;
        height = initial.height + dy;
        break;
    }

    if (shiftKey && ["nw", "ne", "sw", "se"].includes(handle)) {
      const aspectRatio = initial.width / initial.height;
      if (Math.abs(dx) > Math.abs(dy)) {
        height = width / aspectRatio;
      } else {
        width = height * aspectRatio;
      }
    }

    if (width < CANVAS_CONFIG.MIN_SHAPE_SIZE) {
      width = CANVAS_CONFIG.MIN_SHAPE_SIZE;
      if (handle.includes("w")) x = initial.x + initial.width - width;
    }
    if (height < CANVAS_CONFIG.MIN_SHAPE_SIZE) {
      height = CANVAS_CONFIG.MIN_SHAPE_SIZE;
      if (handle.includes("n")) y = initial.y + initial.height - height;
    }

    const shapeToResize = canvas.shapes[shapeIndex];
    const initialPoints = interaction.initialPoints;

    let scaledPoints: Point[] | undefined;
    if (initialPoints && initialPoints.length > 0) {
      const scaleX = initial.width > 0 ? width / initial.width : 1;
      const scaleY = initial.height > 0 ? height / initial.height : 1;
      scaledPoints = initialPoints.map((p: Point) => ({
        x: p.x * scaleX,
        y: p.y * scaleY,
      }));
    }

    let updatedShape: Shape;
    if (
      shapeToResize.type === "freedraw" ||
      shapeToResize.type === "line" ||
      shapeToResize.type === "arrow"
    ) {
      updatedShape = {
        ...shapeToResize,
        x,
        y,
        width,
        height,
        points: scaledPoints || shapeToResize.points,
        updatedAt: Date.now(),
      };
    } else if (shapeToResize.type === "text") {
      // Scale font size proportionally when resizing text
      // Use the initial font size from when resizing started
      const initialFontSize = interaction.initialFontSize || shapeToResize.fontSize;
      const scaleX = initial.width > 0 ? width / initial.width : 1;
      const scaleY = initial.height > 0 ? height / initial.height : 1;
      // Use the average scale for more natural text scaling
      const scale = (scaleX + scaleY) / 2;
      // Calculate new font size based on initial, with no minimum restriction for full flexibility
      const newFontSize = Math.max(6, Math.round(initialFontSize * scale));
      
      updatedShape = {
        ...shapeToResize,
        x,
        y,
        width,
        height,
        fontSize: newFontSize,
        autoResize: false, // Disable auto-resize when manually resizing
        updatedAt: Date.now(),
      };
    } else {
      updatedShape = {
        ...shapeToResize,
        x,
        y,
        width,
        height,
        updatedAt: Date.now(),
      };
    }

    const newShapes = [...canvas.shapes];
    newShapes[shapeIndex] = updatedShape;

    set({ canvas: { ...canvas, shapes: newShapes } });
  },

  finishResizing: () => {
    const state = get();
    const { canvas } = state;
    
    // For text shapes, recalculate bounds to fit the text with the new font size
    if (canvas.selectedIds.length === 1) {
      const shapeIndex = canvas.shapes.findIndex((s) => s.id === canvas.selectedIds[0]);
      if (shapeIndex !== -1) {
        const shape = canvas.shapes[shapeIndex];
        if (shape.type === "text" && shape.text) {
          // Measure the text with the new font size
          const measured = measureTextForStore(shape.text, shape.fontSize, shape.fontFamily, shape.lineHeight);
          
          const updatedShape = {
            ...shape,
            width: measured.width,
            height: measured.height,
            updatedAt: Date.now(),
          };
          
          const newShapes = [...canvas.shapes];
          newShapes[shapeIndex] = updatedShape;
          set({ canvas: { ...canvas, shapes: newShapes } });
        }
      }
    }
    
    set({ interaction: { ...DEFAULT_INTERACTION_STATE } });
    get().saveToHistory();
  },

  // ============================================
  // Panning
  // ============================================

  startPanning: (point) => {
    set({
      interaction: {
        ...get().interaction,
        mode: "panning",
        dragStartPoint: point,
      },
    });
  },

  updatePanning: (point) => {
    const state = get();
    if (state.interaction.mode !== "panning" || !state.interaction.dragStartPoint) return;

    const { canvas, interaction } = state;
    const dragStart = interaction.dragStartPoint!;
    const dx = (point.x - dragStart.x) / canvas.zoom;
    const dy = (point.y - dragStart.y) / canvas.zoom;

    set({
      canvas: {
        ...canvas,
        scrollX: canvas.scrollX + dx,
        scrollY: canvas.scrollY + dy,
      },
      interaction: { ...interaction, dragStartPoint: point },
    });
  },

  finishPanning: () => {
    set({ interaction: { ...DEFAULT_INTERACTION_STATE } });
  },

  // ============================================
  // Selection Box
  // ============================================

  startSelectionBox: (point) => {
    set({
      interaction: {
        ...get().interaction,
        mode: "selecting",
        startPoint: point,
        selectionBox: { x: point.x, y: point.y, width: 0, height: 0 },
      },
    });
  },

  updateSelectionBox: (point) => {
    const state = get();
    if (state.interaction.mode !== "selecting" || !state.interaction.startPoint) return;

    const startPoint = state.interaction.startPoint;
    set({
      interaction: {
        ...state.interaction,
        selectionBox: {
          x: Math.min(startPoint.x, point.x),
          y: Math.min(startPoint.y, point.y),
          width: Math.abs(point.x - startPoint.x),
          height: Math.abs(point.y - startPoint.y),
        },
      },
    });
  },

  finishSelectionBox: () => {
    const { interaction, canvas } = get();
    if (interaction.mode !== "selecting" || !interaction.selectionBox) {
      set({ interaction: { ...DEFAULT_INTERACTION_STATE } });
      return;
    }

    const box = interaction.selectionBox;
    const selectedIds = canvas.shapes
      .filter((shape) => {
        const bounds = getShapeBounds(shape);
        return (
          bounds.x >= box.x &&
          bounds.y >= box.y &&
          bounds.x + bounds.width <= box.x + box.width &&
          bounds.y + bounds.height <= box.y + box.height
        );
      })
      .map((s) => s.id);

    set({
      canvas: { ...canvas, selectedIds },
      interaction: { ...DEFAULT_INTERACTION_STATE },
    });
  },

  setHoveredShape: (id) => {
    const current = get().interaction.hoveredShapeId;
    if (current !== id) {
      set({
        interaction: { ...get().interaction, hoveredShapeId: id },
      });
    }
  },

  setHoveredHandle: (handle) => {
    const current = get().interaction.hoveredHandle;
    if (current !== handle) {
      set({
        interaction: { ...get().interaction, hoveredHandle: handle },
      });
    }
  },

  // ============================================
  // Text Editing
  // ============================================

  startTextEditing: (id) => {
    set({
      interaction: {
        ...get().interaction,
        mode: "editing-text",
        editingTextId: id,
      },
    });
  },

  finishTextEditing: (text, newWidth?: number, newHeight?: number) => {
    const state = get();
    const editingId = state.interaction.editingTextId;
    if (!editingId) return;

    const trimmedText = text.trim();
    
    if (trimmedText === "") {
      // Remove empty text shapes
      const newShapes = state.canvas.shapes.filter((s) => s.id !== editingId);
      set({
        canvas: { ...state.canvas, shapes: newShapes, selectedIds: [] },
        interaction: { ...DEFAULT_INTERACTION_STATE },
      });
    } else {
      // Update the text content and optionally resize
      const newShapes = state.canvas.shapes.map((shape) => {
        if (shape.id === editingId && shape.type === "text") {
          return { 
            ...shape, 
            text: trimmedText, 
            width: newWidth ?? shape.width,
            height: newHeight ?? shape.height,
            updatedAt: Date.now() 
          };
        }
        return shape;
      });
      set({
        canvas: { ...state.canvas, shapes: newShapes, selectedIds: [editingId] },
        interaction: { ...DEFAULT_INTERACTION_STATE },
      });
      get().saveToHistory();
    }
  },

  cancelTextEditing: () => {
    const state = get();
    const editingId = state.interaction.editingTextId;
    if (!editingId) return;

    // Check if it's a new shape with empty text - remove it
    const shape = state.canvas.shapes.find((s) => s.id === editingId);
    if (shape?.type === "text" && (shape as Shape & { text: string }).text === "") {
      const newShapes = state.canvas.shapes.filter((s) => s.id !== editingId);
      set({
        canvas: { ...state.canvas, shapes: newShapes, selectedIds: [] },
        interaction: { ...DEFAULT_INTERACTION_STATE },
      });
    } else {
      set({
        interaction: { ...DEFAULT_INTERACTION_STATE },
      });
    }
  },

  createTextShape: (point) => {
    const state = get();
    const { currentStyle, snapToGrid, gridSize } = state.canvas;

    const snappedPoint = snapToGrid ? snapPointToGrid(point, gridSize) : point;

    const textShape: TextShape = {
      id: createShapeId(),
      type: "text",
      x: snappedPoint.x,
      y: snappedPoint.y,
      width: 200,
      height: 30,
      angle: 0,
      strokeColor: currentStyle.strokeColor,
      strokeWidth: currentStyle.strokeWidth,
      strokeStyle: currentStyle.strokeStyle,
      fillColor: currentStyle.fillColor,
      fillStyle: currentStyle.fillStyle,
      opacity: currentStyle.opacity,
      roughness: 0, // Text should be smooth
      isLocked: false,
      seed: generateSeed(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      text: "",
      fontSize: 20,
      fontFamily: "Virgil",
      textAlign: "left",
      verticalAlign: "middle",
      lineHeight: 1.25,
      autoResize: true,
    };

    set({
      canvas: { ...state.canvas, shapes: [...state.canvas.shapes, textShape] },
      interaction: {
        ...state.interaction,
        mode: "editing-text",
        editingTextId: textShape.id,
      },
    });
  },

  // ============================================
  // History
  // ============================================

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const entry = history[historyIndex - 1];
      const canvas = get().canvas;
      set({
        canvas: { ...canvas, shapes: cloneShapes(entry.shapes), selectedIds: [] },
        historyIndex: historyIndex - 1,
      });
    }
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const entry = history[historyIndex + 1];
      const canvas = get().canvas;
      set({
        canvas: { ...canvas, shapes: cloneShapes(entry.shapes), selectedIds: [] },
        historyIndex: historyIndex + 1,
      });
    }
  },

  saveToHistory: () => {
    const { canvas, historyIndex, history } = get();
    const entry: HistoryEntry = {
      shapes: cloneShapes(canvas.shapes),
      timestamp: Date.now(),
    };

    let newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(entry);

    if (newHistory.length > 100) {
      newHistory = newHistory.slice(-100);
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  // ============================================
  // Utility
  // ============================================

  getShapeAtPoint: (point) => {
    const shapes = get().canvas.shapes;
    
    // Find all shapes that contain the point
    const hitShapes: Shape[] = [];
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (isPointInShape(point, shapes[i])) {
        hitShapes.push(shapes[i]);
      }
    }
    
    if (hitShapes.length === 0) return null;
    if (hitShapes.length === 1) return hitShapes[0];
    
    // Multiple shapes - prioritize by:
    // 1. Text shapes (highest priority - always selectable)
    // 2. Smaller shapes (by area)
    // 3. Z-order (shapes drawn later)
    
    const textShape = hitShapes.find(s => s.type === "text");
    if (textShape) return textShape;
    
    // Sort by area (smallest first) and return the smallest
    hitShapes.sort((a, b) => {
      const areaA = a.width * a.height;
      const areaB = b.width * b.height;
      return areaA - areaB;
    });
    
    return hitShapes[0];
  },

  getSelectedShapes: () => {
    const { shapes, selectedIds } = get().canvas;
    return shapes.filter((s) => selectedIds.includes(s.id));
  },

  getSelectionBounds: () => {
    const selectedShapes = get().getSelectedShapes();
    if (selectedShapes.length === 0) return null;

    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    for (const shape of selectedShapes) {
      const bounds = getShapeBounds(shape);
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  },

  loadDocument: (shapes) => {
    set({
      canvas: { ...get().canvas, shapes, selectedIds: [] },
      history: [],
      historyIndex: -1,
    });
    get().saveToHistory();
  },

  reset: () => {
    set({
      canvas: { ...DEFAULT_CANVAS_STATE },
      interaction: { ...DEFAULT_INTERACTION_STATE },
      history: [],
      historyIndex: -1,
    });
  },
}));

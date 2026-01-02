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
} from "@/lib/canvas";
import { DEFAULT_CANVAS_STATE, DEFAULT_INTERACTION_STATE, CANVAS_CONFIG } from "@/lib/canvas";
import { getShapeBounds, isPointInShape, snapPointToGrid, createShapeId, generateSeed } from "./utils";

// ============================================
// Utilities
// ============================================

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
  updateResizing: (point: Point, shiftKey?: boolean) => void;
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

    let drawingShape: Shape | null = null;

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

    let updatedShape: Shape;

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
      },
    });
  },

  updateResizing: (point, shiftKey = false) => {
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

    const currentShape = canvas.shapes[shapeIndex];
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
      currentShape.type === "freedraw" ||
      currentShape.type === "line" ||
      currentShape.type === "arrow"
    ) {
      updatedShape = {
        ...currentShape,
        x,
        y,
        width,
        height,
        points: scaledPoints || currentShape.points,
        updatedAt: Date.now(),
      };
    } else if (currentShape.type === "text") {
      // Scale font size proportionally when resizing text
      const scaleX = initial.width > 0 ? width / initial.width : 1;
      const scaleY = initial.height > 0 ? height / initial.height : 1;
      const scale = Math.min(scaleX, scaleY); // Use the smaller scale to maintain readability
      const newFontSize = Math.max(8, Math.round(currentShape.fontSize * scale));
      
      updatedShape = {
        ...currentShape,
        x,
        y,
        width,
        height,
        fontSize: newFontSize,
        updatedAt: Date.now(),
      };
    } else {
      updatedShape = {
        ...currentShape,
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
      fontFamily: "Virgil, Segoe UI Emoji, sans-serif",
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
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (isPointInShape(point, shapes[i])) {
        return shapes[i];
      }
    }
    return null;
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

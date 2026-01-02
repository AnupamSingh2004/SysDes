/**
 * Canvas Store - Zustand state management
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  Shape,
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
import { getShapeBounds, isPointInShape, snapPointToGrid } from "./utils";

// ============================================
// Store Types
// ============================================

interface CanvasStore {
  // State
  canvas: CanvasState;
  interaction: InteractionState;
  history: HistoryEntry[];
  historyIndex: number;

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

export const useCanvasStore = create<CanvasStore>()(
  immer((set, get) => ({
    canvas: DEFAULT_CANVAS_STATE,
    interaction: DEFAULT_INTERACTION_STATE,
    history: [],
    historyIndex: -1,

    // ============================================
    // Canvas Actions
    // ============================================

    setTool: (tool) => {
      set((state) => {
        state.canvas.activeTool = tool;
        state.interaction.mode = "idle";
        state.interaction.drawingShape = null;
      });
    },

    setStyle: (style) => {
      set((state) => {
        state.canvas.currentStyle = { ...state.canvas.currentStyle, ...style };

        // Apply to selected shapes
        const selectedIds = state.canvas.selectedIds;
        if (selectedIds.length > 0) {
          state.canvas.shapes = state.canvas.shapes.map((shape) => {
            if (selectedIds.includes(shape.id)) {
              return { ...shape, ...style, updatedAt: Date.now() };
            }
            return shape;
          });
        }
      });
    },

    setZoom: (zoom) => {
      set((state) => {
        state.canvas.zoom = Math.max(CANVAS_CONFIG.MIN_ZOOM, Math.min(CANVAS_CONFIG.MAX_ZOOM, zoom));
      });
    },

    setScroll: (scrollX, scrollY) => {
      set((state) => {
        state.canvas.scrollX = scrollX;
        state.canvas.scrollY = scrollY;
      });
    },

    toggleGrid: () => {
      set((state) => {
        state.canvas.showGrid = !state.canvas.showGrid;
      });
    },

    toggleSnapToGrid: () => {
      set((state) => {
        state.canvas.snapToGrid = !state.canvas.snapToGrid;
      });
    },

    // ============================================
    // Shape Actions
    // ============================================

    addShape: (shape) => {
      set((state) => {
        state.canvas.shapes.push(shape);
      });
      get().saveToHistory();
    },

    updateShape: (id, updates) => {
      set((state) => {
        const index = state.canvas.shapes.findIndex((s) => s.id === id);
        if (index !== -1) {
          state.canvas.shapes[index] = {
            ...state.canvas.shapes[index],
            ...updates,
            updatedAt: Date.now(),
          } as Shape;
        }
      });
    },

    deleteShapes: (ids) => {
      set((state) => {
        state.canvas.shapes = state.canvas.shapes.filter((s) => !ids.includes(s.id));
        state.canvas.selectedIds = state.canvas.selectedIds.filter((id) => !ids.includes(id));
      });
      get().saveToHistory();
    },

    duplicateShapes: (ids) => {
      const shapes = get().canvas.shapes.filter((s) => ids.includes(s.id));
      const duplicates = shapes.map((shape) => ({
        ...shape,
        id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        x: shape.x + 20,
        y: shape.y + 20,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      set((state) => {
        state.canvas.shapes.push(...duplicates);
        state.canvas.selectedIds = duplicates.map((s) => s.id);
      });
      get().saveToHistory();
    },

    bringToFront: (ids) => {
      set((state) => {
        const toMove = state.canvas.shapes.filter((s) => ids.includes(s.id));
        const rest = state.canvas.shapes.filter((s) => !ids.includes(s.id));
        state.canvas.shapes = [...rest, ...toMove];
      });
      get().saveToHistory();
    },

    sendToBack: (ids) => {
      set((state) => {
        const toMove = state.canvas.shapes.filter((s) => ids.includes(s.id));
        const rest = state.canvas.shapes.filter((s) => !ids.includes(s.id));
        state.canvas.shapes = [...toMove, ...rest];
      });
      get().saveToHistory();
    },

    // ============================================
    // Selection
    // ============================================

    selectShape: (id, addToSelection = false) => {
      set((state) => {
        if (addToSelection) {
          if (state.canvas.selectedIds.includes(id)) {
            state.canvas.selectedIds = state.canvas.selectedIds.filter((i) => i !== id);
          } else {
            state.canvas.selectedIds.push(id);
          }
        } else {
          state.canvas.selectedIds = [id];
        }
      });
    },

    selectShapes: (ids) => {
      set((state) => {
        state.canvas.selectedIds = ids;
      });
    },

    selectAll: () => {
      set((state) => {
        state.canvas.selectedIds = state.canvas.shapes.map((s) => s.id);
      });
    },

    deselectAll: () => {
      set((state) => {
        state.canvas.selectedIds = [];
      });
    },

    deleteSelected: () => {
      const ids = get().canvas.selectedIds;
      if (ids.length > 0) {
        get().deleteShapes(ids);
      }
    },

    // ============================================
    // Drawing
    // ============================================

    startDrawing: (point) => {
      const { canvas } = get();
      const { activeTool, currentStyle } = canvas;
      
      // Create a preview shape immediately
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
        seed: Math.floor(Math.random() * 1000000),
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

      set((state) => {
        state.interaction.mode = "drawing";
        state.interaction.startPoint = point;
        state.interaction.currentPoint = point;
        state.interaction.drawingShape = drawingShape;
      });
    },

    updateDrawing: (point, shiftKey = false) => {
      set((state) => {
        if (state.interaction.mode !== "drawing" || !state.interaction.startPoint) return;

        let targetPoint = point;
        if (state.canvas.snapToGrid) {
          targetPoint = snapPointToGrid(point, state.canvas.gridSize);
        }

        const startPoint = state.interaction.startPoint;

        if (shiftKey && startPoint) {
          const dx = targetPoint.x - startPoint.x;
          const dy = targetPoint.y - startPoint.y;
          const size = Math.max(Math.abs(dx), Math.abs(dy));
          targetPoint = {
            x: startPoint.x + size * Math.sign(dx),
            y: startPoint.y + size * Math.sign(dy),
          };
        }

        state.interaction.currentPoint = targetPoint;

        // Update the drawing shape preview
        if (state.interaction.drawingShape) {
          const shape = state.interaction.drawingShape;
          const minX = Math.min(startPoint.x, targetPoint.x);
          const minY = Math.min(startPoint.y, targetPoint.y);
          const width = Math.abs(targetPoint.x - startPoint.x);
          const height = Math.abs(targetPoint.y - startPoint.y);

          switch (shape.type) {
            case "rectangle":
            case "ellipse":
              shape.x = minX;
              shape.y = minY;
              shape.width = width;
              shape.height = height;
              break;
            case "line":
            case "arrow":
              shape.x = startPoint.x;
              shape.y = startPoint.y;
              shape.points = [
                { x: 0, y: 0 },
                { x: targetPoint.x - startPoint.x, y: targetPoint.y - startPoint.y },
              ];
              shape.width = width;
              shape.height = height;
              break;
            case "freedraw":
              // Accumulate points for freedraw
              const lastPoint = shape.points[shape.points.length - 1];
              const dx = targetPoint.x - startPoint.x - lastPoint.x;
              const dy = targetPoint.y - startPoint.y - lastPoint.y;
              // Only add point if moved enough (for smoothness)
              if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                shape.points.push({
                  x: targetPoint.x - startPoint.x,
                  y: targetPoint.y - startPoint.y,
                });
                shape.pressures.push(0.5);
              }
              // Update bounds
              const xs = shape.points.map(p => p.x);
              const ys = shape.points.map(p => p.y);
              const pathMinX = Math.min(...xs);
              const pathMinY = Math.min(...ys);
              const pathMaxX = Math.max(...xs);
              const pathMaxY = Math.max(...ys);
              shape.width = pathMaxX - pathMinX;
              shape.height = pathMaxY - pathMinY;
              break;
          }
          shape.updatedAt = Date.now();
        }
      });
    },

    finishDrawing: () => {
      const { interaction } = get();
      const drawingShape = interaction.drawingShape;
      
      if (drawingShape) {
        // Check if shape is large enough
        const isValidSize = drawingShape.width >= CANVAS_CONFIG.MIN_SHAPE_SIZE || 
                           drawingShape.height >= CANVAS_CONFIG.MIN_SHAPE_SIZE ||
                           (drawingShape.type === "freedraw" && drawingShape.points.length > 2);
        
        if (isValidSize) {
          // Generate a new ID for the final shape
          const finalShape = {
            ...drawingShape,
            id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          };
          
          set((state) => {
            state.canvas.shapes.push(finalShape as Shape);
            state.canvas.selectedIds = [finalShape.id];
            state.interaction = DEFAULT_INTERACTION_STATE;
          });
          get().saveToHistory();
          return;
        }
      }
      
      set((state) => {
        state.interaction = DEFAULT_INTERACTION_STATE;
      });
    },

    cancelDrawing: () => {
      set((state) => {
        state.interaction = DEFAULT_INTERACTION_STATE;
      });
    },

    // ============================================
    // Dragging
    // ============================================

    startDragging: (point) => {
      set((state) => {
        state.interaction.mode = "dragging";
        state.interaction.dragStartPoint = point;
        state.interaction.dragOffset = { x: 0, y: 0 };
      });
    },

    updateDragging: (point) => {
      set((state) => {
        if (state.interaction.mode !== "dragging" || !state.interaction.dragStartPoint) return;

        const dx = point.x - state.interaction.dragStartPoint.x;
        const dy = point.y - state.interaction.dragStartPoint.y;

        const selectedIds = state.canvas.selectedIds;
        state.canvas.shapes = state.canvas.shapes.map((shape) => {
          if (selectedIds.includes(shape.id)) {
            const prevOffset = state.interaction.dragOffset || { x: 0, y: 0 };
            return {
              ...shape,
              x: shape.x + (dx - prevOffset.x),
              y: shape.y + (dy - prevOffset.y),
              updatedAt: Date.now(),
            };
          }
          return shape;
        });

        state.interaction.dragOffset = { x: dx, y: dy };
      });
    },

    finishDragging: () => {
      set((state) => {
        state.interaction = DEFAULT_INTERACTION_STATE;
      });
      get().saveToHistory();
    },

    // ============================================
    // Resizing
    // ============================================

    startResizing: (handle, point) => {
      const selectedShapes = get().getSelectedShapes();
      if (selectedShapes.length !== 1) return;

      const shape = selectedShapes[0];
      set((state) => {
        state.interaction.mode = "resizing";
        state.interaction.resizeHandle = handle;
        state.interaction.dragStartPoint = point;
        state.interaction.initialBounds = {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
        };
        // Store initial points for shapes that have them (freedraw, line, arrow)
        state.interaction.initialPoints = "points" in shape && Array.isArray(shape.points) 
          ? shape.points.map(p => ({ x: p.x, y: p.y }))
          : null;
      });
    },

    updateResizing: (point, shiftKey = false) => {
      set((state) => {
        if (
          state.interaction.mode !== "resizing" ||
          !state.interaction.resizeHandle ||
          !state.interaction.dragStartPoint ||
          !state.interaction.initialBounds
        ) {
          return;
        }

        const selectedIds = state.canvas.selectedIds;
        if (selectedIds.length !== 1) return;

        const shapeIndex = state.canvas.shapes.findIndex((s) => s.id === selectedIds[0]);
        if (shapeIndex === -1) return;

        const dx = point.x - state.interaction.dragStartPoint.x;
        const dy = point.y - state.interaction.dragStartPoint.y;

        const initial = state.interaction.initialBounds;
        let { x, y, width, height } = initial;

        const handle = state.interaction.resizeHandle;
        switch (handle) {
          case "nw": x = initial.x + dx; y = initial.y + dy; width = initial.width - dx; height = initial.height - dy; break;
          case "n": y = initial.y + dy; height = initial.height - dy; break;
          case "ne": y = initial.y + dy; width = initial.width + dx; height = initial.height - dy; break;
          case "w": x = initial.x + dx; width = initial.width - dx; break;
          case "e": width = initial.width + dx; break;
          case "sw": x = initial.x + dx; width = initial.width - dx; height = initial.height + dy; break;
          case "s": height = initial.height + dy; break;
          case "se": width = initial.width + dx; height = initial.height + dy; break;
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

        // Update the shape
        const currentShape = state.canvas.shapes[shapeIndex];
        
        // For shapes with points (freedraw, line, arrow), scale the points from initial
        const initialPoints = state.interaction.initialPoints;
        let scaledPoints: Point[] | undefined;
        
        if (initialPoints && initialPoints.length > 0) {
          const scaleX = initial.width > 0 ? width / initial.width : 1;
          const scaleY = initial.height > 0 ? height / initial.height : 1;
          
          scaledPoints = initialPoints.map((p: Point) => ({
            x: p.x * scaleX,
            y: p.y * scaleY,
          }));
        }

        // Build the updated shape based on type
        if (currentShape.type === "freedraw" || currentShape.type === "line" || currentShape.type === "arrow") {
          state.canvas.shapes[shapeIndex] = {
            ...currentShape,
            x, y, width, height,
            points: scaledPoints || currentShape.points,
            updatedAt: Date.now(),
          };
        } else {
          state.canvas.shapes[shapeIndex] = {
            ...currentShape,
            x, y, width, height,
            updatedAt: Date.now(),
          };
        }
      });
    },

    finishResizing: () => {
      set((state) => {
        state.interaction = DEFAULT_INTERACTION_STATE;
      });
      get().saveToHistory();
    },

    // ============================================
    // Panning
    // ============================================

    startPanning: (point) => {
      set((state) => {
        state.interaction.mode = "panning";
        state.interaction.dragStartPoint = point;
      });
    },

    updatePanning: (point) => {
      set((state) => {
        if (state.interaction.mode !== "panning" || !state.interaction.dragStartPoint) return;

        const dx = (point.x - state.interaction.dragStartPoint.x) / state.canvas.zoom;
        const dy = (point.y - state.interaction.dragStartPoint.y) / state.canvas.zoom;

        state.canvas.scrollX += dx;
        state.canvas.scrollY += dy;
        state.interaction.dragStartPoint = point;
      });
    },

    finishPanning: () => {
      set((state) => {
        state.interaction = DEFAULT_INTERACTION_STATE;
      });
    },

    // ============================================
    // Selection Box
    // ============================================

    startSelectionBox: (point) => {
      set((state) => {
        state.interaction.mode = "selecting";
        state.interaction.startPoint = point;
        state.interaction.selectionBox = { x: point.x, y: point.y, width: 0, height: 0 };
      });
    },

    updateSelectionBox: (point) => {
      set((state) => {
        if (state.interaction.mode !== "selecting" || !state.interaction.startPoint) return;

        const startPoint = state.interaction.startPoint;
        state.interaction.selectionBox = {
          x: Math.min(startPoint.x, point.x),
          y: Math.min(startPoint.y, point.y),
          width: Math.abs(point.x - startPoint.x),
          height: Math.abs(point.y - startPoint.y),
        };
      });
    },

    finishSelectionBox: () => {
      const { interaction, canvas } = get();
      if (interaction.mode !== "selecting" || !interaction.selectionBox) {
        set((state) => { state.interaction = DEFAULT_INTERACTION_STATE; });
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

      set((state) => {
        state.canvas.selectedIds = selectedIds;
        state.interaction = DEFAULT_INTERACTION_STATE;
      });
    },

    setHoveredShape: (id) => {
      set((state) => { state.interaction.hoveredShapeId = id; });
    },

    setHoveredHandle: (handle) => {
      set((state) => { state.interaction.hoveredHandle = handle; });
    },

    // ============================================
    // History
    // ============================================

    undo: () => {
      const { historyIndex, history } = get();
      if (historyIndex > 0) {
        const entry = history[historyIndex - 1];
        set((state) => {
          state.canvas.shapes = JSON.parse(JSON.stringify(entry.shapes));
          state.historyIndex = historyIndex - 1;
          state.canvas.selectedIds = [];
        });
      }
    },

    redo: () => {
      const { historyIndex, history } = get();
      if (historyIndex < history.length - 1) {
        const entry = history[historyIndex + 1];
        set((state) => {
          state.canvas.shapes = JSON.parse(JSON.stringify(entry.shapes));
          state.historyIndex = historyIndex + 1;
          state.canvas.selectedIds = [];
        });
      }
    },

    saveToHistory: () => {
      const { canvas, historyIndex, history } = get();
      const entry: HistoryEntry = {
        shapes: JSON.parse(JSON.stringify(canvas.shapes)),
        timestamp: Date.now(),
      };

      set((state) => {
        state.history = history.slice(0, historyIndex + 1);
        state.history.push(entry);
        state.historyIndex = state.history.length - 1;

        if (state.history.length > 100) {
          state.history = state.history.slice(-100);
          state.historyIndex = state.history.length - 1;
        }
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

      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;

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
      set((state) => {
        state.canvas.shapes = shapes;
        state.canvas.selectedIds = [];
        state.history = [];
        state.historyIndex = -1;
      });
      get().saveToHistory();
    },

    reset: () => {
      set((state) => {
        state.canvas = DEFAULT_CANVAS_STATE;
        state.interaction = DEFAULT_INTERACTION_STATE;
        state.history = [];
        state.historyIndex = -1;
      });
    },
  }))
);

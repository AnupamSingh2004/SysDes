/**
 * Custom Canvas - High-performance canvas component
 * Uses requestAnimationFrame and refs for smooth real-time updates
 */

"use client";

import React, { useRef, useCallback, useEffect, useState, memo, useMemo } from "react";
import throttle from "lodash.throttle";
import type { Point, ResizeHandle, Shape, Bounds, TextShape } from "@/lib/canvas";
import { CANVAS_CONFIG } from "@/lib/canvas";
import { useCanvasStore } from "./store";
import { ShapeRenderer } from "./shape-renderer";
import { screenToCanvas, getResizeHandleAtPoint, getCursorForHandle, getShapeBounds } from "./utils";

// ============================================
// Helper: Check if point is in shape bounds (for dragging selected shapes)
// This ignores hollow/fill logic - just checks bounding box
// ============================================

function isPointInShapeForDrag(point: Point, shape: Shape): boolean {
  const bounds = getShapeBounds(shape);
  const padding = Math.max(shape.strokeWidth / 2, 4);
  return (
    point.x >= bounds.x - padding &&
    point.x <= bounds.x + bounds.width + padding &&
    point.y >= bounds.y - padding &&
    point.y <= bounds.y + bounds.height + padding
  );
}

// ============================================
// Text Measurement Utilities
// ============================================

function measureText(
  text: string,
  fontSize: number,
  fontFamily: string,
  lineHeight: number = 1.25
): { width: number; height: number } {
  // Create a temporary canvas for text measurement
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
    width: Math.max(maxWidth + 4, 100), // min width of 100
    height: Math.max(height, fontSize * lineHeight),
  };
}

// ============================================
// Text Editor Component (Excalidraw-style WYSIWYG)
// ============================================

interface TextEditorProps {
  shape: TextShape;
  zoom: number;
  scrollX: number;
  scrollY: number;
  onFinish: (text: string, newWidth?: number, newHeight?: number) => void;
}

const TextEditor = memo(function TextEditor({
  shape,
  zoom,
  scrollX,
  scrollY,
  onFinish,
}: TextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(shape.text);
  const isFirstRender = useRef(true);
  const hasFinished = useRef(false);

  // Reset value when shape changes (e.g., editing a different text)
  useEffect(() => {
    setValue(shape.text);
    hasFinished.current = false;
  }, [shape.id, shape.text]);

  // Auto-resize textarea as content changes
  const dimensions = useMemo(() => {
    const measured = measureText(value || " ", shape.fontSize, shape.fontFamily, shape.lineHeight);
    return {
      width: Math.max(measured.width, 100),
      height: Math.max(measured.height, shape.fontSize * (shape.lineHeight || 1.25)),
    };
  }, [value, shape.fontSize, shape.fontFamily, shape.lineHeight]);

  // Focus the textarea on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Select all text when editing existing text, cursor at end for new text
        if (shape.text) {
          textareaRef.current.select();
        } else {
          textareaRef.current.setSelectionRange(0, 0);
        }
        isFirstRender.current = false;
      }
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate screen position - offset slightly for visibility
  const screenX = (shape.x + scrollX) * zoom;
  const screenY = (shape.y + scrollY) * zoom - 4; // Slight offset above
  
  const finishEditing = useCallback(() => {
    if (hasFinished.current) return;
    hasFinished.current = true;
    const measured = measureText(value || " ", shape.fontSize, shape.fontFamily, shape.lineHeight);
    onFinish(value, measured.width, measured.height);
  }, [value, shape.fontSize, shape.fontFamily, shape.lineHeight, onFinish]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    
    // Escape or Tab to finish editing (save changes)
    if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      finishEditing();
      return;
    }
    
    // Shift+Enter for new line (Enter alone also works naturally in textarea)
  };

  const handleBlur = () => {
    if (!isFirstRender.current) {
      finishEditing();
    }
  };

  const scaledFontSize = shape.fontSize * zoom;
  const scaledLineHeight = shape.lineHeight || 1.25;
  // Use a reasonable max width for wrapping, or shape width if larger
  const maxWidth = Math.max(shape.width * zoom, 300 * zoom);
  const scaledWidth = Math.max(dimensions.width * zoom, 100 * zoom, maxWidth);
  const scaledHeight = Math.max(dimensions.height * zoom, scaledFontSize * scaledLineHeight);

  return (
    <div
      className="fixed z-[9999] pointer-events-auto"
      style={{
        left: screenX,
        top: screenY,
        transformOrigin: "top left",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="block border-none outline-none resize-none"
        style={{
          width: scaledWidth,
          minWidth: 100 * zoom,
          maxWidth: "80vw", // Prevent going off screen
          minHeight: scaledHeight,
          fontSize: scaledFontSize,
          fontFamily: shape.fontFamily,
          color: shape.strokeColor,
          lineHeight: scaledLineHeight,
          padding: "4px 2px",
          margin: 0,
          textAlign: shape.textAlign,
          caretColor: shape.strokeColor,
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          wordBreak: "break-word",
          // Excalidraw-style subtle highlight
          background: "rgba(30, 30, 30, 0.95)",
          borderRadius: "4px",
          boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.6), 0 4px 12px rgba(0,0,0,0.3)",
        }}
        placeholder="Type here..."
        autoFocus
        spellCheck={false}
      />
    </div>
  );
});

// ============================================
// Memoized Components
// ============================================

// Individual shape renderer - memoized to prevent re-renders
const MemoizedShape = memo(function MemoizedShape({
  shape,
  isSelected,
  isHovered,
}: {
  shape: Shape;
  isSelected: boolean;
  isHovered: boolean;
}) {
  return (
    <ShapeRenderer
      shape={shape}
      isSelected={isSelected}
      isHovered={isHovered}
    />
  );
}, (prev, next) => {
  // Only re-render if shape changed or selection/hover status changed
  return (
    prev.shape === next.shape &&
    prev.isSelected === next.isSelected &&
    prev.isHovered === next.isHovered
  );
});

// ============================================
// Main Canvas Component
// ============================================

interface CustomCanvasProps {
  className?: string;
}

export function CustomCanvas({ className }: CustomCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState("default");
  
  // Local state for tracking active interactions (bypasses React state for performance)
  const localStateRef = useRef({
    isDragging: false,
    isDrawing: false,
    isResizing: false,
    isPanning: false,
    isSelecting: false,
    draggedShapes: new Map<string, { x: number; y: number }>(),
    drawingShape: null as Shape | null,
    selectionBox: null as Bounds | null,
    lineEndpoint: null as "start" | "end" | null, // For line/arrow endpoint dragging
  });

  // Subscribe to store with minimal re-renders
  const shapes = useCanvasStore((s) => s.canvas.shapes);
  const selectedIds = useCanvasStore((s) => s.canvas.selectedIds);
  const scrollX = useCanvasStore((s) => s.canvas.scrollX);
  const scrollY = useCanvasStore((s) => s.canvas.scrollY);
  const zoom = useCanvasStore((s) => s.canvas.zoom);
  const showGrid = useCanvasStore((s) => s.canvas.showGrid);
  const gridSize = useCanvasStore((s) => s.canvas.gridSize);
  const currentStyle = useCanvasStore((s) => s.canvas.currentStyle);
  const mode = useCanvasStore((s) => s.interaction.mode);
  const hoveredShapeId = useCanvasStore((s) => s.interaction.hoveredShapeId);
  const storeDrawingShape = useCanvasStore((s) => s.interaction.drawingShape);
  const storeSelectionBox = useCanvasStore((s) => s.interaction.selectionBox);
  const editingTextId = useCanvasStore((s) => s.interaction.editingTextId);

  // Get store functions once
  const storeActions = useMemo(() => useCanvasStore.getState(), []);

  // ============================================
  // Coordinate Transform
  // ============================================

  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const { scrollX, scrollY, zoom } = useCanvasStore.getState().canvas;
      return screenToCanvas(clientX, clientY, scrollX, scrollY, zoom, rect);
    },
    []
  );

  // ============================================
  // Pointer Handlers - Using throttled updates for performance
  // ============================================

  // Throttled pointer move handler - prevents excessive updates
  const throttledPointerMove = useMemo(
    () =>
      throttle(
        (clientX: number, clientY: number, shiftKey: boolean) => {
          const local = localStateRef.current;
          const state = useCanvasStore.getState();
          const point = getCanvasPoint(clientX, clientY);

          // Handle active interactions
          if (local.isPanning) {
            storeActions.updatePanning({ x: clientX, y: clientY });
            return;
          }

          if (local.isDragging) {
            storeActions.updateDragging(point);
            return;
          }

          if (local.isResizing) {
            storeActions.updateResizing(point, shiftKey, local.lineEndpoint);
            return;
          }

          if (local.isSelecting) {
            storeActions.updateSelectionBox(point);
            return;
          }

          if (local.isDrawing) {
            storeActions.updateDrawing(point, shiftKey);
            return;
          }

          // Hover detection (only when idle)
          if (state.interaction.mode === "idle") {
            if (state.canvas.selectedIds.length === 1) {
              const selectionBounds = storeActions.getSelectionBounds();
              if (selectionBounds) {
                const handle = getResizeHandleAtPoint(
                  point,
                  selectionBounds,
                  CANVAS_CONFIG.HANDLE_SIZE,
                  state.canvas.zoom
                );
                if (handle) {
                  storeActions.setHoveredHandle(handle);
                  setCursor(getCursorForHandle(handle));
                  return;
                }
              }
            }
            storeActions.setHoveredHandle(null);

            if (state.canvas.activeTool === "select") {
              const hoveredShape = storeActions.getShapeAtPoint(point);
              storeActions.setHoveredShape(hoveredShape?.id || null);
              setCursor(hoveredShape ? "move" : "default");
            } else if (state.canvas.activeTool === "eraser") {
              storeActions.setHoveredShape(null);
              // Custom eraser cursor - circle indicator
              setCursor("crosshair");
            } else {
              storeActions.setHoveredShape(null);
              setCursor("crosshair");
            }
          }
        },
        16, // ~60fps
        { leading: true, trailing: true }
      ),
    [getCanvasPoint, storeActions]
  );

  // Cleanup throttle on unmount
  useEffect(() => {
    return () => {
      throttledPointerMove.cancel();
    };
  }, [throttledPointerMove]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const state = useCanvasStore.getState();
      const { canvas, interaction } = state;
      
      // Don't process pointer events when editing text (let the textarea handle it)
      if (interaction.mode === "editing-text") {
        return;
      }
      
      // Capture pointer for smooth tracking
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

      // Middle click or Alt+click = pan
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        storeActions.startPanning({ x: e.clientX, y: e.clientY });
        localStateRef.current.isPanning = true;
        setCursor("grabbing");
        return;
      }

      const point = getCanvasPoint(e.clientX, e.clientY);

      // Check for line/arrow endpoint handles first
      if (canvas.selectedIds.length === 1) {
        const selectedShape = canvas.shapes.find(s => s.id === canvas.selectedIds[0]);
        if (selectedShape && (selectedShape.type === "line" || selectedShape.type === "arrow") && "points" in selectedShape) {
          const points = selectedShape.points;
          if (points.length >= 2) {
            const handleRadius = CANVAS_CONFIG.HANDLE_SIZE / 2 / canvas.zoom;
            const startPoint = { x: selectedShape.x + points[0].x, y: selectedShape.y + points[0].y };
            const endPoint = { x: selectedShape.x + points[points.length - 1].x, y: selectedShape.y + points[points.length - 1].y };
            
            const distToStart = Math.sqrt((point.x - startPoint.x) ** 2 + (point.y - startPoint.y) ** 2);
            const distToEnd = Math.sqrt((point.x - endPoint.x) ** 2 + (point.y - endPoint.y) ** 2);
            
            if (distToStart <= handleRadius * 2) {
              // Start point handle - use "nw" as marker for start
              storeActions.startResizing("nw", point);
              localStateRef.current.isResizing = true;
              localStateRef.current.lineEndpoint = "start";
              return;
            }
            if (distToEnd <= handleRadius * 2) {
              // End point handle - use "se" as marker for end
              storeActions.startResizing("se", point);
              localStateRef.current.isResizing = true;
              localStateRef.current.lineEndpoint = "end";
              return;
            }
          }
        }
      }

      // Check for resize handle first if we have a selection
      if (canvas.selectedIds.length === 1) {
        const selectedShape = canvas.shapes.find(s => s.id === canvas.selectedIds[0]);
        // Skip standard resize handles for lines and arrows
        if (!selectedShape || (selectedShape.type !== "line" && selectedShape.type !== "arrow")) {
          const selectionBounds = storeActions.getSelectionBounds();
          if (selectionBounds) {
            const handle = getResizeHandleAtPoint(point, selectionBounds, CANVAS_CONFIG.HANDLE_SIZE, canvas.zoom);
            if (handle) {
              storeActions.startResizing(handle, point);
              localStateRef.current.isResizing = true;
              return;
            }
          }
        }
      }

      // Handle tool-specific behavior
      switch (canvas.activeTool) {
        case "select": {
          const clickedShape = storeActions.getShapeAtPoint(point);
          
          // Check if clicking on any already selected shape (for dragging multiple)
          const clickedOnSelection = canvas.selectedIds.length > 0 && 
            canvas.shapes.some(s => 
              canvas.selectedIds.includes(s.id) && isPointInShapeForDrag(point, s)
            );
          
          if (clickedOnSelection) {
            // Start dragging the entire selection
            storeActions.startDragging(point);
            localStateRef.current.isDragging = true;
            
            const selected = state.canvas.shapes.filter(s => canvas.selectedIds.includes(s.id));
            localStateRef.current.draggedShapes.clear();
            selected.forEach(s => {
              localStateRef.current.draggedShapes.set(s.id, { x: s.x, y: s.y });
            });
          } else if (clickedShape) {
            if (e.shiftKey) {
              storeActions.selectShape(clickedShape.id, true);
            } else if (!canvas.selectedIds.includes(clickedShape.id)) {
              storeActions.selectShape(clickedShape.id, false);
            }
            storeActions.startDragging(point);
            localStateRef.current.isDragging = true;
            
            // Initialize dragged shapes positions
            const selected = state.canvas.shapes.filter(s => 
              state.canvas.selectedIds.includes(s.id) || s.id === clickedShape.id
            );
            localStateRef.current.draggedShapes.clear();
            selected.forEach(s => {
              localStateRef.current.draggedShapes.set(s.id, { x: s.x, y: s.y });
            });
          } else {
            storeActions.deselectAll();
            storeActions.startSelectionBox(point);
            localStateRef.current.isSelecting = true;
            localStateRef.current.selectionBox = { x: point.x, y: point.y, width: 0, height: 0 };
          }
          break;
        }

        case "pan":
          storeActions.startPanning({ x: e.clientX, y: e.clientY });
          localStateRef.current.isPanning = true;
          setCursor("grabbing");
          break;

        case "rectangle":
        case "ellipse":
        case "line":
        case "arrow":
        case "freedraw":
        case "eraser": {
          const clickedShape = storeActions.getShapeAtPoint(point);
          if (clickedShape && canvas.selectedIds.includes(clickedShape.id) && canvas.activeTool !== "eraser") {
            storeActions.startDragging(point);
            localStateRef.current.isDragging = true;
            
            const selected = state.canvas.shapes.filter(s => state.canvas.selectedIds.includes(s.id));
            localStateRef.current.draggedShapes.clear();
            selected.forEach(s => {
              localStateRef.current.draggedShapes.set(s.id, { x: s.x, y: s.y });
            });
          } else {
            storeActions.deselectAll();
            storeActions.startDrawing(point);
            localStateRef.current.isDrawing = true;
          }
          break;
        }

        case "text": {
          // Check if clicking on an existing text shape
          const clickedShape = storeActions.getShapeAtPoint(point);
          if (clickedShape?.type === "text") {
            // Single click just selects the text (double-click to edit)
            if (!canvas.selectedIds.includes(clickedShape.id)) {
              storeActions.selectShape(clickedShape.id, false);
            }
            // Allow dragging the text shape
            storeActions.startDragging(point);
            localStateRef.current.isDragging = true;
            localStateRef.current.draggedShapes.clear();
            localStateRef.current.draggedShapes.set(clickedShape.id, { x: clickedShape.x, y: clickedShape.y });
          } else {
            // Create new text shape at click position
            storeActions.deselectAll();
            storeActions.createTextShape(point);
          }
          break;
        }
      }
    },
    [getCanvasPoint, storeActions]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      throttledPointerMove(e.clientX, e.clientY, e.shiftKey);
    },
    [throttledPointerMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const local = localStateRef.current;
      
      // Release pointer capture
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

      if (local.isPanning) {
        storeActions.finishPanning();
        local.isPanning = false;
        const tool = useCanvasStore.getState().canvas.activeTool;
        setCursor(tool === "pan" ? "grab" : "default");
      }

      if (local.isDragging) {
        storeActions.finishDragging();
        local.isDragging = false;
        local.draggedShapes.clear();
      }

      if (local.isResizing) {
        storeActions.finishResizing();
        local.isResizing = false;
        local.lineEndpoint = null;
      }

      if (local.isSelecting) {
        storeActions.finishSelectionBox();
        local.isSelecting = false;
        local.selectionBox = null;
      }

      if (local.isDrawing) {
        storeActions.finishDrawing();
        local.isDrawing = false;
        local.drawingShape = null;
      }
    },
    [storeActions]
  );

  // ============================================
  // Wheel Handler (Zoom/Pan) - Using native event for proper preventDefault
  // ============================================

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      const state = useCanvasStore.getState();
      const { zoom, scrollX, scrollY } = state.canvas;

      // Ctrl/Cmd + wheel = zoom towards mouse position
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        
        // Calculate zoom delta (scroll up = zoom in)
        const delta = e.deltaY < 0 ? CANVAS_CONFIG.ZOOM_STEP : -CANVAS_CONFIG.ZOOM_STEP;
        const newZoom = Math.max(
          CANVAS_CONFIG.MIN_ZOOM,
          Math.min(CANVAS_CONFIG.MAX_ZOOM, zoom + delta)
        );
        
        if (newZoom === zoom) return;

        // Get mouse position relative to canvas element
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate the point in canvas coordinates under the mouse
        const canvasX = mouseX / zoom - scrollX;
        const canvasY = mouseY / zoom - scrollY;

        // Calculate new scroll to keep the same canvas point under the mouse
        const newScrollX = mouseX / newZoom - canvasX;
        const newScrollY = mouseY / newZoom - canvasY;

        // Update both zoom and scroll together
        storeActions.setZoom(newZoom);
        storeActions.setScroll(newScrollX, newScrollY);
      } else {
        // Pan with regular wheel
        storeActions.setScroll(
          scrollX - e.deltaX / zoom,
          scrollY - e.deltaY / zoom
        );
      }
    };

    // Use passive: false to allow preventDefault on wheel
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [storeActions]);

  // ============================================
  // Keyboard Shortcuts
  // ============================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        storeActions.deleteSelected();
        return;
      }

      if (ctrl && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) storeActions.redo();
        else storeActions.undo();
        return;
      }

      if (ctrl && e.key === "a") {
        e.preventDefault();
        storeActions.selectAll();
        return;
      }

      if (ctrl && e.key === "c") {
        e.preventDefault();
        storeActions.copySelected();
        return;
      }

      if (ctrl && e.key === "x") {
        e.preventDefault();
        storeActions.cutSelected();
        return;
      }

      if (ctrl && e.key === "v") {
        e.preventDefault();
        storeActions.paste();
        return;
      }

      if (ctrl && e.key === "d") {
        e.preventDefault();
        const state = useCanvasStore.getState();
        if (state.canvas.selectedIds.length > 0) {
          storeActions.duplicateShapes(state.canvas.selectedIds);
        }
        return;
      }

      switch (e.key) {
        case "v":
        case "1":
          storeActions.setTool("select");
          break;
        case "h":
        case "2":
          storeActions.setTool("pan");
          break;
        case "r":
        case "3":
          storeActions.setTool("rectangle");
          break;
        case "o":
        case "4":
          storeActions.setTool("ellipse");
          break;
        case "l":
        case "5":
          storeActions.setTool("line");
          break;
        case "a":
          if (!ctrl) storeActions.setTool("arrow");
          break;
        case "p":
        case "7":
          storeActions.setTool("freedraw");
          break;
        case "e":
        case "9":
          storeActions.setTool("eraser");
          break;
        case "t":
        case "8":
          storeActions.setTool("text");
          break;
        case "Escape":
          storeActions.deselectAll();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [storeActions]);

  // ============================================
  // Computed Values
  // ============================================

  // Selection bounds - computed when needed
  const selectionBounds = useMemo(() => {
    if (selectedIds.length === 0) return null;
    
    const selectedShapes = shapes.filter(s => selectedIds.includes(s.id));
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
  }, [shapes, selectedIds]);

  // ============================================
  // Render Helpers
  // ============================================

  const renderDrawingPreview = () => {
    if (mode !== "drawing" || !storeDrawingShape) return null;
    
    // For eraser, show a circle indicator instead of the shape
    if (storeDrawingShape.type === "eraser") {
      const eraserRadius = Math.max(currentStyle.strokeWidth * 3, 15);
      const eraserShape = storeDrawingShape as import("@/lib/canvas").EraserShape;
      const lastPoint = eraserShape.points[eraserShape.points.length - 1];
      return (
        <g>
          <circle
            cx={eraserShape.x + lastPoint.x}
            cy={eraserShape.y + lastPoint.y}
            r={eraserRadius}
            fill="none"
            stroke="#ef4444"
            strokeWidth={2 / zoom}
            strokeDasharray={`${4 / zoom},${4 / zoom}`}
            opacity={0.8}
          />
        </g>
      );
    }
    
    return (
      <g opacity={0.8}>
        <ShapeRenderer shape={storeDrawingShape as import("@/lib/canvas").Shape} />
      </g>
    );
  };

  const renderSelectionUI = () => {
    if (!selectionBounds) return null;

    const handleSize = CANVAS_CONFIG.HANDLE_SIZE;
    
    // Check if the selected shape is a line or arrow
    const selectedShape = selectedIds.length === 1 
      ? shapes.find(s => s.id === selectedIds[0])
      : null;
    const isLineOrArrow = selectedShape && (selectedShape.type === "line" || selectedShape.type === "arrow");
    
    // For lines/arrows, show endpoint handles instead of corner handles
    if (isLineOrArrow && selectedShape && "points" in selectedShape) {
      const points = selectedShape.points;
      if (points.length >= 2) {
        const startPoint = { x: selectedShape.x + points[0].x, y: selectedShape.y + points[0].y };
        const endPoint = { x: selectedShape.x + points[points.length - 1].x, y: selectedShape.y + points[points.length - 1].y };
        
        return (
          <g>
            {/* Start point handle */}
            <circle
              cx={startPoint.x}
              cy={startPoint.y}
              r={handleSize / 2 / zoom}
              fill="#ffffff"
              stroke="#3b82f6"
              strokeWidth={1.5 / zoom}
              style={{ cursor: "move" }}
              data-handle="line-start"
            />
            {/* End point handle */}
            <circle
              cx={endPoint.x}
              cy={endPoint.y}
              r={handleSize / 2 / zoom}
              fill="#ffffff"
              stroke="#3b82f6"
              strokeWidth={1.5 / zoom}
              style={{ cursor: "move" }}
              data-handle="line-end"
            />
          </g>
        );
      }
    }

    // Standard handles for other shapes
    const handles: { pos: ResizeHandle; x: number; y: number }[] = [
      { pos: "nw", x: selectionBounds.x, y: selectionBounds.y },
      { pos: "n", x: selectionBounds.x + selectionBounds.width / 2, y: selectionBounds.y },
      { pos: "ne", x: selectionBounds.x + selectionBounds.width, y: selectionBounds.y },
      { pos: "w", x: selectionBounds.x, y: selectionBounds.y + selectionBounds.height / 2 },
      { pos: "e", x: selectionBounds.x + selectionBounds.width, y: selectionBounds.y + selectionBounds.height / 2 },
      { pos: "sw", x: selectionBounds.x, y: selectionBounds.y + selectionBounds.height },
      { pos: "s", x: selectionBounds.x + selectionBounds.width / 2, y: selectionBounds.y + selectionBounds.height },
      { pos: "se", x: selectionBounds.x + selectionBounds.width, y: selectionBounds.y + selectionBounds.height },
    ];

    return (
      <g>
        <rect
          x={selectionBounds.x - CANVAS_CONFIG.SELECTION_PADDING}
          y={selectionBounds.y - CANVAS_CONFIG.SELECTION_PADDING}
          width={selectionBounds.width + CANVAS_CONFIG.SELECTION_PADDING * 2}
          height={selectionBounds.height + CANVAS_CONFIG.SELECTION_PADDING * 2}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={1 / zoom}
          strokeDasharray={`${4 / zoom},${4 / zoom}`}
        />
        {selectedIds.length === 1 &&
          handles.map(({ pos, x, y }) => (
            <rect
              key={pos}
              x={x - handleSize / 2 / zoom}
              y={y - handleSize / 2 / zoom}
              width={handleSize / zoom}
              height={handleSize / zoom}
              fill="#ffffff"
              stroke="#3b82f6"
              strokeWidth={1 / zoom}
              style={{ cursor: getCursorForHandle(pos) }}
            />
          ))}
      </g>
    );
  };

  const renderSelectionBox = () => {
    if (mode !== "selecting" || !storeSelectionBox) return null;

    return (
      <rect
        x={storeSelectionBox.x}
        y={storeSelectionBox.y}
        width={storeSelectionBox.width}
        height={storeSelectionBox.height}
        fill="rgba(59, 130, 246, 0.1)"
        stroke="#3b82f6"
        strokeWidth={1 / zoom}
        strokeDasharray={`${4 / zoom},${4 / zoom}`}
      />
    );
  };

  // ============================================
  // Main Render
  // ============================================

  // Handle double-click to edit text
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const point = getCanvasPoint(e.clientX, e.clientY);
      const clickedShape = storeActions.getShapeAtPoint(point);
      if (clickedShape?.type === "text") {
        storeActions.selectShape(clickedShape.id, false);
        storeActions.startTextEditing(clickedShape.id);
      }
    },
    [getCanvasPoint, storeActions]
  );

  return (
    <div
      ref={canvasRef}
      className={`relative w-full h-full overflow-hidden touch-none ${className}`}
      style={{
        cursor,
        backgroundColor: "#121212",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      {/* Grid Background - Dot pattern like Excalidraw */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, ${CANVAS_CONFIG.GRID_DOT_COLOR} ${CANVAS_CONFIG.GRID_DOT_SIZE}px, transparent ${CANVAS_CONFIG.GRID_DOT_SIZE}px)`,
            backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
            backgroundPosition: `${scrollX * zoom}px ${scrollY * zoom}px`,
          }}
        />
      )}

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{
          transform: `scale(${zoom}) translate(${scrollX}px, ${scrollY}px)`,
          transformOrigin: "0 0",
          overflow: "visible",
        }}
      >
        {/* Render shapes */}
        {shapes.map((shape) => (
          <MemoizedShape
            key={shape.id}
            shape={shape}
            isSelected={selectedIds.includes(shape.id)}
            isHovered={hoveredShapeId === shape.id}
          />
        ))}

        {/* Drawing preview */}
        {renderDrawingPreview()}

        {/* Selection UI */}
        {renderSelectionUI()}

        {/* Selection box */}
        {renderSelectionBox()}
      </svg>

      {/* Text Editor Overlay */}
      {mode === "editing-text" && editingTextId && (() => {
        const editingShape = shapes.find(s => s.id === editingTextId);
        if (editingShape?.type === "text") {
          return (
            <TextEditor
              shape={editingShape as TextShape}
              zoom={zoom}
              scrollX={scrollX}
              scrollY={scrollY}
              onFinish={(text, newWidth, newHeight) => storeActions.finishTextEditing(text, newWidth, newHeight)}
            />
          );
        }
        return null;
      })()}
    </div>
  );
}

export default CustomCanvas;

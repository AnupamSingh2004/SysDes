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
// Text Editor Component
// ============================================

interface TextEditorProps {
  shape: TextShape;
  zoom: number;
  scrollX: number;
  scrollY: number;
  onFinish: (text: string, newWidth?: number, newHeight?: number) => void;
  onCancel: () => void;
}

const TextEditor = memo(function TextEditor({
  shape,
  zoom,
  scrollX,
  scrollY,
  onFinish,
  onCancel,
}: TextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(shape.text);
  const isFirstRender = useRef(true);

  // Focus the textarea on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Place cursor at end
        textareaRef.current.setSelectionRange(value.length, value.length);
        isFirstRender.current = false;
      }
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  // Calculate screen position
  const screenX = (shape.x + scrollX) * zoom;
  const screenY = (shape.y + scrollY) * zoom;
  
  // Calculate content size based on text
  const lineHeight = (shape.lineHeight || 1.25) * shape.fontSize * zoom;
  const lines = value.split("\n");
  const contentHeight = Math.max(lineHeight * lines.length + 16, shape.height * zoom);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // Prevent canvas shortcuts
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
    // Allow Shift+Enter for new lines, Enter alone finishes editing
    // Removed single Enter to finish - users can click outside instead
  };

  const handleBlur = () => {
    if (!isFirstRender.current) {
      // Calculate the new size based on content
      if (measureRef.current) {
        const rect = measureRef.current.getBoundingClientRect();
        const newWidth = Math.max(200, rect.width / zoom + 20);
        const newHeight = Math.max(30, rect.height / zoom + 10);
        onFinish(value, newWidth, newHeight);
      } else {
        onFinish(value);
      }
    }
  };

  return (
    <>
      {/* Hidden div to measure text content */}
      <div
        ref={measureRef}
        style={{
          position: "absolute",
          visibility: "hidden",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: shape.fontSize * zoom,
          fontFamily: shape.fontFamily,
          lineHeight: shape.lineHeight || 1.25,
          padding: "4px 8px",
          minWidth: 150,
          maxWidth: 500 * zoom,
        }}
      >
        {value || " "}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute z-50 border-2 border-blue-500 rounded-md outline-none resize-none"
        style={{
          left: screenX,
          top: screenY,
          width: Math.max(200, shape.width * zoom),
          height: contentHeight,
          fontSize: shape.fontSize * zoom,
          fontFamily: shape.fontFamily,
          color: shape.strokeColor,
          backgroundColor: "rgba(18, 18, 18, 0.98)",
          lineHeight: shape.lineHeight || 1.25,
          padding: "4px 8px",
          margin: 0,
          caretColor: "#3b82f6",
          textAlign: shape.textAlign,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.3)",
          overflow: "hidden",
        }}
        placeholder="Type something..."
        autoFocus
      />
    </>
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
  });

  // Subscribe to store with minimal re-renders
  const shapes = useCanvasStore((s) => s.canvas.shapes);
  const selectedIds = useCanvasStore((s) => s.canvas.selectedIds);
  const scrollX = useCanvasStore((s) => s.canvas.scrollX);
  const scrollY = useCanvasStore((s) => s.canvas.scrollY);
  const zoom = useCanvasStore((s) => s.canvas.zoom);
  const showGrid = useCanvasStore((s) => s.canvas.showGrid);
  const gridSize = useCanvasStore((s) => s.canvas.gridSize);
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
            storeActions.updateResizing(point, shiftKey);
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

      // Check for resize handle first if we have a selection
      if (canvas.selectedIds.length === 1) {
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

      // Handle tool-specific behavior
      switch (canvas.activeTool) {
        case "select": {
          const clickedShape = storeActions.getShapeAtPoint(point);
          if (clickedShape) {
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
        case "freedraw": {
          const clickedShape = storeActions.getShapeAtPoint(point);
          if (clickedShape && canvas.selectedIds.includes(clickedShape.id)) {
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
          // Check if clicking on an existing text shape to edit it
          const clickedShape = storeActions.getShapeAtPoint(point);
          if (clickedShape?.type === "text") {
            storeActions.selectShape(clickedShape.id, false);
            storeActions.startTextEditing(clickedShape.id);
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
    return (
      <g opacity={0.8}>
        <ShapeRenderer shape={storeDrawingShape} />
      </g>
    );
  };

  const renderSelectionUI = () => {
    if (!selectionBounds) return null;

    const handleSize = CANVAS_CONFIG.HANDLE_SIZE;
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
              onCancel={() => storeActions.cancelTextEditing()}
            />
          );
        }
        return null;
      })()}
    </div>
  );
}

export default CustomCanvas;

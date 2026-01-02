/**
 * Custom Canvas - Main canvas component with drawing and interactions
 */

"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import type { Point, ResizeHandle } from "@/lib/canvas";
import { CANVAS_CONFIG } from "@/lib/canvas";
import { useCanvasStore } from "./store";
import { ShapeRenderer } from "./shape-renderer";
import { screenToCanvas, getResizeHandleAtPoint, getCursorForHandle } from "./utils";

interface CustomCanvasProps {
  className?: string;
}

export function CustomCanvas({ className }: CustomCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState("default");

  const {
    canvas,
    interaction,
    setTool,
    setZoom,
    setScroll,
    selectShape,
    deselectAll,
    startDrawing,
    updateDrawing,
    finishDrawing,
    startDragging,
    updateDragging,
    finishDragging,
    startResizing,
    updateResizing,
    finishResizing,
    startPanning,
    updatePanning,
    finishPanning,
    startSelectionBox,
    updateSelectionBox,
    finishSelectionBox,
    setHoveredShape,
    setHoveredHandle,
    getShapeAtPoint,
    getSelectionBounds,
    undo,
    redo,
    deleteSelected,
  } = useCanvasStore();

  const { shapes, selectedIds, scrollX, scrollY, zoom, activeTool, showGrid, gridSize } = canvas;
  const { mode, selectionBox, hoveredShapeId, drawingShape } = interaction;

  // ============================================
  // Coordinate Transform
  // ============================================

  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      return screenToCanvas(clientX, clientY, scrollX, scrollY, zoom, rect);
    },
    [scrollX, scrollY, zoom]
  );

  // ============================================
  // Mouse Handlers
  // ============================================

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        // Middle click or Alt+click = pan
        startPanning({ x: e.clientX, y: e.clientY });
        setCursor("grabbing");
        return;
      }

      const point = getCanvasPoint(e.clientX, e.clientY);

      // ALWAYS check for resize handle first if we have a selection
      // This allows resizing even when a drawing tool is selected
      if (selectedIds.length === 1) {
        const selectionBounds = getSelectionBounds();
        if (selectionBounds) {
          const handle = getResizeHandleAtPoint(point, selectionBounds, CANVAS_CONFIG.HANDLE_SIZE, zoom);
          if (handle) {
            startResizing(handle, point);
            return;
          }
        }
      }

      // Handle tool-specific behavior
      switch (activeTool) {
        case "select": {
          // Check for shape click
          const clickedShape = getShapeAtPoint(point);
          if (clickedShape) {
            if (e.shiftKey) {
              selectShape(clickedShape.id, true);
            } else if (!selectedIds.includes(clickedShape.id)) {
              selectShape(clickedShape.id, false);
            }
            startDragging(point);
          } else {
            deselectAll();
            startSelectionBox(point);
          }
          break;
        }

        case "pan":
          startPanning({ x: e.clientX, y: e.clientY });
          setCursor("grabbing");
          break;

        case "rectangle":
        case "ellipse":
        case "line":
        case "arrow":
        case "freedraw": {
          // Check if clicking on the selected shape to drag it
          const clickedShape = getShapeAtPoint(point);
          if (clickedShape && selectedIds.includes(clickedShape.id)) {
            startDragging(point);
          } else {
            deselectAll();
            startDrawing(point);
          }
          break;
        }

        default:
          break;
      }
    },
    [activeTool, getCanvasPoint, selectedIds, getSelectionBounds, getShapeAtPoint, selectShape, deselectAll, startDrawing, startDragging, startResizing, startPanning, startSelectionBox, zoom]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const point = getCanvasPoint(e.clientX, e.clientY);

      // Handle active interaction modes
      switch (mode) {
        case "panning":
          updatePanning({ x: e.clientX, y: e.clientY });
          return;
        case "dragging":
          updateDragging(point);
          return;
        case "resizing":
          updateResizing(point, e.shiftKey);
          return;
        case "selecting":
          updateSelectionBox(point);
          return;
        case "drawing":
          updateDrawing(point, e.shiftKey);
          return;
      }

      // Hover detection
      if (mode === "idle") {
        // Check resize handles first (regardless of tool, if shape is selected)
        if (selectedIds.length === 1) {
          const selectionBounds = getSelectionBounds();
          if (selectionBounds) {
            const handle = getResizeHandleAtPoint(point, selectionBounds, CANVAS_CONFIG.HANDLE_SIZE, zoom);
            if (handle) {
              setHoveredHandle(handle);
              setCursor(getCursorForHandle(handle));
              return;
            }
          }
        }
        setHoveredHandle(null);

        // For select tool, also handle shape hover
        if (activeTool === "select") {
          const hoveredShape = getShapeAtPoint(point);
          setHoveredShape(hoveredShape?.id || null);
          setCursor(hoveredShape ? "move" : "default");
        } else {
          setHoveredShape(null);
          setCursor("crosshair");
        }
      }
    },
    [mode, activeTool, getCanvasPoint, selectedIds, getSelectionBounds, getShapeAtPoint, updatePanning, updateDragging, updateResizing, updateSelectionBox, updateDrawing, setHoveredShape, setHoveredHandle, zoom]
  );

  const handlePointerUp = useCallback(
    () => {
      switch (mode) {
        case "panning":
          finishPanning();
          setCursor(activeTool === "pan" ? "grab" : "default");
          break;

        case "dragging":
          finishDragging();
          break;

        case "resizing":
          finishResizing();
          break;

        case "selecting":
          finishSelectionBox();
          break;

        case "drawing":
          finishDrawing();
          break;
      }
    },
    [mode, activeTool, finishPanning, finishDragging, finishResizing, finishSelectionBox, finishDrawing]
  );

  // ============================================
  // Wheel Handler (Zoom)
  // ============================================

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -CANVAS_CONFIG.ZOOM_STEP : CANVAS_CONFIG.ZOOM_STEP;
        setZoom(zoom + delta);
      } else {
        // Pan with wheel - subtract to get natural scroll direction
        setScroll(scrollX - e.deltaX / zoom, scrollY - e.deltaY / zoom);
      }
    },
    [zoom, scrollX, scrollY, setZoom, setScroll]
  );

  // ============================================
  // Keyboard Shortcuts
  // ============================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }

      // Undo/Redo
      if (ctrl && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      // Select All
      if (ctrl && e.key === "a") {
        e.preventDefault();
        useCanvasStore.getState().selectAll();
        return;
      }

      // Tool shortcuts
      switch (e.key) {
        case "v":
        case "1":
          setTool("select");
          break;
        case "h":
        case "2":
          setTool("pan");
          break;
        case "r":
        case "3":
          setTool("rectangle");
          break;
        case "o":
        case "4":
          setTool("ellipse");
          break;
        case "l":
        case "5":
          setTool("line");
          break;
        case "a":
          if (!ctrl) setTool("arrow");
          break;
        case "p":
        case "7":
          setTool("freedraw");
          break;
        case "Escape":
          deselectAll();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setTool, deleteSelected, undo, redo, deselectAll]);

  // ============================================
  // Drawing Preview
  // ============================================

  const drawingPreview = (() => {
    if (mode !== "drawing" || !drawingShape) return null;
    
    // Render the actual shape preview using ShapeRenderer
    return (
      <g opacity={0.8}>
        <ShapeRenderer shape={drawingShape} />
      </g>
    );
  })();

  // ============================================
  // Selection UI
  // ============================================

  const selectionUI = (() => {
    if (selectedIds.length === 0) return null;

    const bounds = getSelectionBounds();
    if (!bounds) return null;

    const handleSize = CANVAS_CONFIG.HANDLE_SIZE;
    const handles: { pos: ResizeHandle; x: number; y: number }[] = [
      { pos: "nw", x: bounds.x, y: bounds.y },
      { pos: "n", x: bounds.x + bounds.width / 2, y: bounds.y },
      { pos: "ne", x: bounds.x + bounds.width, y: bounds.y },
      { pos: "w", x: bounds.x, y: bounds.y + bounds.height / 2 },
      { pos: "e", x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
      { pos: "sw", x: bounds.x, y: bounds.y + bounds.height },
      { pos: "s", x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
      { pos: "se", x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    ];

    return (
      <g>
        {/* Selection rectangle */}
        <rect
          x={bounds.x - CANVAS_CONFIG.SELECTION_PADDING}
          y={bounds.y - CANVAS_CONFIG.SELECTION_PADDING}
          width={bounds.width + CANVAS_CONFIG.SELECTION_PADDING * 2}
          height={bounds.height + CANVAS_CONFIG.SELECTION_PADDING * 2}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={1 / zoom}
          strokeDasharray={`${4 / zoom},${4 / zoom}`}
        />
        {/* Resize handles (only for single selection) */}
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
  })();

  // ============================================
  // Selection Box UI
  // ============================================

  const selectionBoxUI = (() => {
    if (mode !== "selecting" || !selectionBox) return null;

    return (
      <rect
        x={selectionBox.x}
        y={selectionBox.y}
        width={selectionBox.width}
        height={selectionBox.height}
        fill="rgba(59, 130, 246, 0.1)"
        stroke="#3b82f6"
        strokeWidth={1 / zoom}
        strokeDasharray={`${4 / zoom},${4 / zoom}`}
      />
    );
  })();

  // ============================================
  // Render
  // ============================================

  return (
    <div
      ref={canvasRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ 
        cursor,
        backgroundColor: "#121212",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      {/* Grid Background Layer - Infinite tiling */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(${CANVAS_CONFIG.GRID_COLOR} 1px, transparent 1px),
              linear-gradient(90deg, ${CANVAS_CONFIG.GRID_COLOR} 1px, transparent 1px),
              linear-gradient(${CANVAS_CONFIG.GRID_BOLD_COLOR} 1px, transparent 1px),
              linear-gradient(90deg, ${CANVAS_CONFIG.GRID_BOLD_COLOR} 1px, transparent 1px)
            `,
            backgroundSize: `
              ${gridSize * zoom}px ${gridSize * zoom}px,
              ${gridSize * zoom}px ${gridSize * zoom}px,
              ${gridSize * CANVAS_CONFIG.GRID_BOLD_INTERVAL * zoom}px ${gridSize * CANVAS_CONFIG.GRID_BOLD_INTERVAL * zoom}px,
              ${gridSize * CANVAS_CONFIG.GRID_BOLD_INTERVAL * zoom}px ${gridSize * CANVAS_CONFIG.GRID_BOLD_INTERVAL * zoom}px
            `,
            backgroundPosition: `
              ${scrollX * zoom}px ${scrollY * zoom}px,
              ${scrollX * zoom}px ${scrollY * zoom}px,
              ${scrollX * zoom}px ${scrollY * zoom}px,
              ${scrollX * zoom}px ${scrollY * zoom}px
            `,
          }}
        />
      )}

      {/* SVG Canvas for shapes */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{
          transform: `scale(${zoom}) translate(${scrollX}px, ${scrollY}px)`,
          transformOrigin: "0 0",
          overflow: "visible",
        }}
      >
        {/* Shapes */}
        {shapes.map((shape) => (
          <ShapeRenderer
            key={shape.id}
            shape={shape}
            isSelected={selectedIds.includes(shape.id)}
            isHovered={hoveredShapeId === shape.id}
          />
        ))}

        {/* Drawing preview */}
        {drawingPreview}

        {/* Selection UI */}
        {selectionUI}

        {/* Selection box */}
        {selectionBoxUI}
      </svg>
    </div>
  );
}

export default CustomCanvas;

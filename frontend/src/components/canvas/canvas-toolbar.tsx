/**
 * Canvas Toolbar - Tool selection and style controls
 */

"use client";

import React from "react";
import { useShallow } from "zustand/react/shallow";
import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Pencil,
  Type,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  CaseSensitive,
  Eraser,
} from "lucide-react";
import type { ToolType, StrokeStyle, FillStyle, TextShape } from "@/lib/canvas";
import { COLOR_PALETTE, STROKE_WIDTHS, FONT_FAMILIES } from "@/lib/canvas";
import { useCanvasStore } from "./store";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CanvasToolbarProps {
  className?: string;
}

interface ToolButtonProps {
  tool: ToolType;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}

function ToolButton({ tool, icon, label, shortcut }: ToolButtonProps) {
  const activeTool = useCanvasStore((s) => s.canvas.activeTool);
  const setTool = useCanvasStore((s) => s.setTool);

  const isActive = activeTool === tool;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => setTool(tool)}
          className={cn(
            "p-2 rounded-lg transition-colors",
            isActive
              ? "bg-blue-500/20 text-blue-400"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut && (
          <kbd className="px-1.5 py-0.5 text-xs bg-zinc-700 rounded">{shortcut}</kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function CanvasToolbar({ className }: CanvasToolbarProps) {
  const zoom = useCanvasStore((s) => s.canvas.zoom);
  const showGrid = useCanvasStore((s) => s.canvas.showGrid);
  const selectedIds = useCanvasStore((s) => s.canvas.selectedIds);
  const historyIndex = useCanvasStore((s) => s.historyIndex);
  const historyLength = useCanvasStore((s) => s.history.length);
  
  const { setZoom, toggleGrid, undo, redo, deleteSelected, duplicateShapes } = useCanvasStore(
    useShallow((s) => ({
      setZoom: s.setZoom,
      toggleGrid: s.toggleGrid,
      undo: s.undo,
      redo: s.redo,
      deleteSelected: s.deleteSelected,
      duplicateShapes: s.duplicateShapes,
    }))
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;
  const hasSelection = selectedIds.length > 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex flex-col gap-1 p-2 bg-zinc-900/95 backdrop-blur border border-zinc-800 rounded-xl", className)}>
        {/* Tools */}
        <div className="flex flex-col gap-1">
          <ToolButton tool="select" icon={<MousePointer2 size={20} />} label="Select" shortcut="V" />
          <ToolButton tool="pan" icon={<Hand size={20} />} label="Pan" shortcut="H" />
          
          <div className="h-px bg-zinc-800 my-1" />
          
          <ToolButton tool="rectangle" icon={<Square size={20} />} label="Rectangle" shortcut="R" />
          <ToolButton tool="ellipse" icon={<Circle size={20} />} label="Ellipse" shortcut="O" />
          <ToolButton tool="line" icon={<Minus size={20} />} label="Line" shortcut="L" />
          <ToolButton tool="arrow" icon={<ArrowRight size={20} />} label="Arrow" shortcut="A" />
          <ToolButton tool="freedraw" icon={<Pencil size={20} />} label="Draw" shortcut="P" />
          <ToolButton tool="eraser" icon={<Eraser size={20} />} label="Eraser" shortcut="E" />
          <ToolButton tool="text" icon={<Type size={20} />} label="Text" shortcut="T" />
        </div>

        <div className="h-px bg-zinc-800 my-1" />

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={undo}
                disabled={!canUndo}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  canUndo
                    ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    : "text-zinc-600 cursor-not-allowed"
                )}
              >
                <Undo2 size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <span>Undo</span>
              <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-zinc-700 rounded">⌘Z</kbd>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={redo}
                disabled={!canRedo}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  canRedo
                    ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    : "text-zinc-600 cursor-not-allowed"
                )}
              >
                <Redo2 size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <span>Redo</span>
              <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-zinc-700 rounded">⌘⇧Z</kbd>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="h-px bg-zinc-800 my-1" />

        {/* Zoom */}
        <div className="flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setZoom(zoom + 0.1)}
                className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
              >
                <ZoomIn size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Zoom In</TooltipContent>
          </Tooltip>

          <div className="text-xs text-center text-zinc-500 py-1">
            {Math.round(zoom * 100)}%
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setZoom(zoom - 0.1)}
                className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
              >
                <ZoomOut size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Zoom Out</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleGrid}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  showGrid
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                )}
              >
                <Grid3X3 size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Toggle Grid</TooltipContent>
          </Tooltip>
        </div>

        {/* Selection Actions */}
        {hasSelection && (
          <>
            <div className="h-px bg-zinc-800 my-1" />
            <div className="flex flex-col gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => duplicateShapes(selectedIds)}
                    className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                  >
                    <Copy size={20} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Duplicate</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={deleteSelected}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <span>Delete</span>
                  <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-zinc-700 rounded">Del</kbd>
                </TooltipContent>
              </Tooltip>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

// ============================================
// Style Panel (for right side)
// ============================================

export function StylePanel({ className }: { className?: string }) {
  const currentStyle = useCanvasStore((s) => s.canvas.currentStyle);
  const setStyle = useCanvasStore((s) => s.setStyle);
  const [isExpanded, setIsExpanded] = React.useState(true);

  return (
    <div className={cn("bg-zinc-900/95 backdrop-blur border border-zinc-800 rounded-xl overflow-hidden shadow-xl", className)}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Palette size={14} className="text-white" />
          </div>
          <span className="text-sm font-medium text-zinc-200">Style</span>
        </div>
        <div className={cn(
          "p-1 rounded-md transition-all",
          isExpanded ? "bg-zinc-800" : "hover:bg-zinc-800"
        )}>
          {isExpanded ? (
            <ChevronUp size={14} className="text-zinc-400" />
          ) : (
            <ChevronDown size={14} className="text-zinc-400" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="flex flex-col gap-5 p-4 min-w-[220px]">
          {/* Stroke Color */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Stroke Color</label>
              <div 
                className="w-4 h-4 rounded-full border border-zinc-600" 
                style={{ backgroundColor: currentStyle.strokeColor }}
              />
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={() => setStyle({ strokeColor: color })}
                  className={cn(
                    "w-7 h-7 rounded-lg transition-all duration-150 hover:scale-110",
                    currentStyle.strokeColor === color
                      ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-zinc-900 scale-110"
                      : "hover:ring-1 hover:ring-zinc-600"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Fill Color */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Fill Color</label>
              <div 
                className="w-4 h-4 rounded-full border border-zinc-600"
                style={{ 
                  backgroundColor: currentStyle.fillStyle === "none" ? "transparent" : currentStyle.fillColor,
                  backgroundImage: currentStyle.fillStyle === "none" 
                    ? "repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(255,255,255,0.1) 2px,rgba(255,255,255,0.1) 4px)" 
                    : undefined
                }}
              />
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              <button
                onClick={() => setStyle({ fillColor: "transparent", fillStyle: "none" })}
                className={cn(
                  "w-7 h-7 rounded-lg transition-all duration-150 hover:scale-110 border border-zinc-700",
                  currentStyle.fillStyle === "none"
                    ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-zinc-900 scale-110"
                    : "hover:ring-1 hover:ring-zinc-600"
                )}
                title="No fill"
              >
                <span className="block w-full h-full rounded-md bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(255,255,255,0.15)_2px,rgba(255,255,255,0.15)_4px)]" />
              </button>
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={() => setStyle({ fillColor: color, fillStyle: currentStyle.fillStyle === "none" ? "solid" : currentStyle.fillStyle })}
                  className={cn(
                    "w-7 h-7 rounded-lg transition-all duration-150 hover:scale-110",
                    currentStyle.fillColor === color && currentStyle.fillStyle !== "none"
                      ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-zinc-900 scale-110"
                      : "hover:ring-1 hover:ring-zinc-600"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

          {/* Stroke Width */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Stroke Width</label>
            <div className="flex gap-2">
              {STROKE_WIDTHS.map((width) => (
                <button
                  key={width}
                  onClick={() => setStyle({ strokeWidth: width })}
                  className={cn(
                    "flex-1 h-10 rounded-lg border-2 transition-all duration-150 flex items-center justify-center",
                    currentStyle.strokeWidth === width
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50"
                  )}
                  title={`${width}px`}
                >
                  <div
                    className="bg-zinc-300 rounded-full"
                    style={{ width: width * 3 + 2, height: width * 3 + 2 }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Stroke Style */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Line Style</label>
            <div className="flex gap-2">
              {([
                { style: "solid" as StrokeStyle, label: "Solid" },
                { style: "dashed" as StrokeStyle, label: "Dashed" },
                { style: "dotted" as StrokeStyle, label: "Dotted" },
              ]).map(({ style, label }) => (
                <button
                  key={style}
                  onClick={() => setStyle({ strokeStyle: style })}
                  className={cn(
                    "flex-1 h-10 rounded-lg border-2 transition-all duration-150 flex flex-col items-center justify-center gap-1",
                    currentStyle.strokeStyle === style
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50"
                  )}
                  title={label}
                >
                  <svg width="32" height="3" className="text-zinc-300">
                    <line
                      x1="0"
                      y1="1.5"
                      x2="32"
                      y2="1.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={style === "dashed" ? "6,4" : style === "dotted" ? "2,4" : undefined}
                    />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Fill Style */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Fill Pattern</label>
            <div className="flex gap-2">
              {([
                { style: "solid" as FillStyle, label: "Solid", icon: "▓" },
                { style: "hachure" as FillStyle, label: "Hachure", icon: "≡" },
                { style: "cross-hatch" as FillStyle, label: "Cross", icon: "#" },
              ]).map(({ style, label, icon }) => (
                <button
                  key={style}
                  onClick={() => setStyle({ fillStyle: style })}
                  className={cn(
                    "flex-1 h-10 rounded-lg border-2 transition-all duration-150 flex items-center justify-center",
                    currentStyle.fillStyle === style
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50"
                  )}
                  title={label}
                >
                  <span className="text-zinc-400 text-lg font-mono">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

          {/* Roughness / Drawing Style */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Drawing Style</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { roughness: 0, label: "Clean" },
                { roughness: 1, label: "Sketch" },
                { roughness: 2, label: "Rough" },
              ]).map(({ roughness, label }) => (
                <button
                  key={roughness}
                  onClick={() => setStyle({ roughness })}
                  className={cn(
                    "p-2 rounded-lg border-2 transition-all duration-150 flex flex-col items-center gap-1",
                    currentStyle.roughness === roughness ||
                    (roughness === 2 && currentStyle.roughness >= 2)
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50"
                  )}
                >
                  <svg width="28" height="12" className="text-zinc-300">
                    {roughness === 0 ? (
                      <line x1="2" y1="6" x2="26" y2="6" stroke="currentColor" strokeWidth="2" />
                    ) : roughness === 1 ? (
                      <path d="M2,6 Q8,4 14,6 Q20,8 26,6" stroke="currentColor" strokeWidth="2" fill="none" />
                    ) : (
                      <path d="M2,6 Q5,2 10,7 Q15,3 20,8 Q24,4 26,6" stroke="currentColor" strokeWidth="2" fill="none" />
                    )}
                  </svg>
                  <span className="text-[10px] font-medium text-zinc-400">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Text Style Panel (shows when text is selected or text tool is active)
// ============================================

export function TextStylePanel({ className }: { className?: string }) {
  const { activeTool, selectedIds, shapes } = useCanvasStore(
    useShallow((s) => ({
      activeTool: s.canvas.activeTool,
      selectedIds: s.canvas.selectedIds,
      shapes: s.canvas.shapes,
    }))
  );
  const updateShape = useCanvasStore((s) => s.updateShape);
  const [isExpanded, setIsExpanded] = React.useState(true);

  // Get the selected text shape if any
  const selectedTextShape = React.useMemo(() => {
    if (selectedIds.length !== 1) return null;
    const shape = shapes.find(s => s.id === selectedIds[0]);
    return shape?.type === "text" ? shape as TextShape : null;
  }, [selectedIds, shapes]);

  // Show panel only when text tool is active or a text shape is selected
  const shouldShow = activeTool === "text" || selectedTextShape !== null;

  if (!shouldShow) return null;

  const textShape = selectedTextShape;

  const updateTextProperty = (updates: Partial<TextShape>) => {
    if (textShape) {
      updateShape(textShape.id, updates);
    }
  };

  return (
    <div className={cn("bg-zinc-900/95 backdrop-blur border border-zinc-800 rounded-xl overflow-hidden shadow-xl", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <CaseSensitive size={14} className="text-white" />
          </div>
          <span className="text-sm font-medium text-zinc-200">Text</span>
        </div>
        <div className={cn("p-1 rounded-md transition-all", isExpanded ? "bg-zinc-800" : "hover:bg-zinc-800")}>
          {isExpanded ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-4 p-4 min-w-[220px]">
          {/* Font Size */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Font Size</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { size: 16, label: "S" },
                { size: 20, label: "M" },
                { size: 28, label: "L" },
                { size: 36, label: "XL" },
                { size: 48, label: "2XL" },
                { size: 64, label: "3XL" },
              ]).map(({ size, label }) => (
                <button
                  key={size}
                  onClick={() => updateTextProperty({ fontSize: size })}
                  disabled={!textShape}
                  className={cn(
                    "p-2 rounded-lg border-2 transition-all duration-150 flex items-center justify-center",
                    textShape?.fontSize === size
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50",
                    !textShape && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="text-xs font-medium text-zinc-300">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Font Family</label>
            <div className="flex flex-col gap-2">
              {FONT_FAMILIES.map(({ name, value }) => (
                <button
                  key={value}
                  onClick={() => updateTextProperty({ fontFamily: value })}
                  disabled={!textShape}
                  className={cn(
                    "p-2 rounded-lg border-2 transition-all duration-150 text-left",
                    textShape?.fontFamily === value
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50",
                    !textShape && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span 
                    className="text-sm text-zinc-300" 
                    style={{ fontFamily: value }}
                  >
                    {name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Text Alignment */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Text Align</label>
            <div className="flex gap-2">
              {([
                { align: "left" as const, icon: AlignLeft },
                { align: "center" as const, icon: AlignCenter },
                { align: "right" as const, icon: AlignRight },
              ]).map(({ align, icon: Icon }) => (
                <button
                  key={align}
                  onClick={() => updateTextProperty({ textAlign: align })}
                  disabled={!textShape}
                  className={cn(
                    "flex-1 p-2 rounded-lg border-2 transition-all duration-150 flex items-center justify-center",
                    textShape?.textAlign === align
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50",
                    !textShape && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Icon size={16} className="text-zinc-300" />
                </button>
              ))}
            </div>
          </div>

          {/* Vertical Alignment */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Vertical Align</label>
            <div className="flex gap-2">
              {([
                { align: "top" as const, icon: AlignVerticalJustifyStart },
                { align: "middle" as const, icon: AlignVerticalJustifyCenter },
                { align: "bottom" as const, icon: AlignVerticalJustifyEnd },
              ]).map(({ align, icon: Icon }) => (
                <button
                  key={align}
                  onClick={() => updateTextProperty({ verticalAlign: align })}
                  disabled={!textShape}
                  className={cn(
                    "flex-1 p-2 rounded-lg border-2 transition-all duration-150 flex items-center justify-center",
                    textShape?.verticalAlign === align
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50",
                    !textShape && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Icon size={16} className="text-zinc-300" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CanvasToolbar;

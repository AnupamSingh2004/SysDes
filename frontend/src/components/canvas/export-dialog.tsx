"use client";

import { useState, useCallback, useRef } from "react";
import { Download, ImageIcon, FileImage, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "./store";
import { getShapeBounds } from "./utils";
import type { Shape } from "@/lib/canvas";

// ─── types ─────────────────────────────────────────────────────────────────
type Background = "white" | "black" | "transparent";
type Format = "png" | "jpeg";

// ─── color helpers ─────────────────────────────────────────────────────────

function isWhiteish(color: string): boolean {
  if (!color || color === "none" || color === "transparent") return false;
  const c = color.toLowerCase().trim();
  return (
    c === "#fff" ||
    c === "#ffffff" ||
    c === "white" ||
    /^rgba?\(\s*25[0-5]|2[0-4]\d|[01]?\d\d?\s*,\s*25[0-5]|2[0-4]\d|[01]?\d\d?\s*,\s*25[0-5]|2[0-4]\d|[01]?\d\d?/.test(c) ||
    // Specifically catch the rough canvas stroke color in dark mode
    c.startsWith("rgba(255,255,255") ||
    c.startsWith("rgba(255, 255, 255")
  );
}

function isDarkish(color: string): boolean {
  if (!color || color === "none" || color === "transparent") return false;
  const c = color.toLowerCase().trim();
  return (
    c === "#000" ||
    c === "#000000" ||
    c === "#1e1e1e" ||
    c === "black" ||
    c.startsWith("rgba(0,0,0") ||
    c.startsWith("rgba(0, 0, 0")
  );
}

function adjustColor(color: string, bg: Background): string {
  if (!color || color === "none" || color === "transparent") return color;
  if (bg === "transparent") return color;

  if (bg === "white" && isWhiteish(color)) {
    // White strokes become dark for white background
    // Preserve opacity from rgba if present
    const alphaMatch = color.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
    const alpha = alphaMatch ? parseFloat(alphaMatch[1]) : 1;
    return alpha < 1 ? `rgba(30,30,30,${alpha})` : "#1e1e1e";
  }

  if (bg === "black" && isDarkish(color)) {
    // Dark strokes become white for black background
    const alphaMatch = color.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
    const alpha = alphaMatch ? parseFloat(alphaMatch[1]) : 1;
    return alpha < 1 ? `rgba(255,255,255,${alpha})` : "#ffffff";
  }

  return color;
}

function processClonedSVG(svgClone: SVGSVGElement, bg: Background) {
  if (bg === "transparent") return;

  // Walk every element that has stroke or fill
  const allEls = svgClone.querySelectorAll("*");
  allEls.forEach(el => {
    const stroke = el.getAttribute("stroke");
    const fill = el.getAttribute("fill");
    const stopColor = el.getAttribute("stop-color");

    if (stroke && stroke !== "none") {
      el.setAttribute("stroke", adjustColor(stroke, bg));
    }
    if (fill && fill !== "none" && fill !== "transparent") {
      el.setAttribute("fill", adjustColor(fill, bg));
    }
    if (stopColor) {
      el.setAttribute("stop-color", adjustColor(stopColor, bg));
    }

    // Also handle inline style stroke/fill
    const styleAttr = el.getAttribute("style");
    if (styleAttr) {
      const updated = styleAttr
        .replace(/stroke:\s*([^;]+)/g, (_, c) => `stroke: ${adjustColor(c.trim(), bg)}`)
        .replace(/fill:\s*([^;]+)/g, (_, c) => `fill: ${adjustColor(c.trim(), bg)}`);
      el.setAttribute("style", updated);
    }
  });
}

// ─── compute content bounding box from shapes ──────────────────────────────
function computeContentBounds(shapes: Shape[]) {
  if (shapes.length === 0) return null;

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const shape of shapes) {
    const b = getShapeBounds(shape);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  const PAD = 48;
  return {
    x: minX - PAD,
    y: minY - PAD,
    width: maxX - minX + PAD * 2,
    height: maxY - minY + PAD * 2,
  };
}

// ─── core export function ──────────────────────────────────────────────────
async function runExport(
  container: HTMLDivElement,
  shapes: Shape[],
  bg: Background,
  format: Format,
  scale: number = 2 // retina quality
): Promise<void> {
  // 1. Find the canvas SVG
  const svgEl = container.querySelector("svg");
  if (!svgEl) throw new Error("Canvas SVG not found");

  // 2. Compute content bounding box
  const bounds = computeContentBounds(shapes);
  if (!bounds) throw new Error("No content to export");

  // 3. Clone the SVG
  const clone = svgEl.cloneNode(true) as SVGSVGElement;

  // 4. Remove CSS transform (shapes are in canvas coords; we use viewBox)
  clone.style.transform = "";
  clone.style.transformOrigin = "";
  clone.style.overflow = "visible";
  clone.removeAttribute("class");

  // 5. Set viewBox to content bounds
  clone.setAttribute("viewBox", `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
  const exportW = Math.round(bounds.width * scale);
  const exportH = Math.round(bounds.height * scale);
  clone.setAttribute("width", String(exportW));
  clone.setAttribute("height", String(exportH));

  // 6. Add background rectangle as very first child
  const bgColor = bg === "white" ? "#ffffff" : bg === "black" ? "#000000" : "none";
  if (bg !== "transparent") {
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("x", String(bounds.x));
    bgRect.setAttribute("y", String(bounds.y));
    bgRect.setAttribute("width", String(bounds.width));
    bgRect.setAttribute("height", String(bounds.height));
    bgRect.setAttribute("fill", bgColor);
    clone.insertBefore(bgRect, clone.firstChild);
  }

  // 7. Process colors
  processClonedSVG(clone, bg);

  // 8. Serialize to SVG string (add XML namespace for standalone SVG)
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  const svgStr = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(blob);

  try {
    // 9. Render SVG to canvas element
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = exportW;
    canvas.height = exportH;
    const ctx = canvas.getContext("2d")!;

    // Fill canvas background (matters for JPEG which can't be transparent)
    if (bg !== "transparent" || format === "jpeg") {
      ctx.fillStyle = bg === "white" ? "#ffffff" : bg === "black" ? "#000000" : "#ffffff";
      ctx.fillRect(0, 0, exportW, exportH);
    }

    ctx.drawImage(img, 0, 0, exportW, exportH);

    // 10. Download
    const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
    const quality = format === "jpeg" ? 0.92 : undefined;
    const dataUrl = canvas.toDataURL(mimeType, quality);

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `canvas-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

// ─── option button ─────────────────────────────────────────────────────────
function OptionBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
        active
          ? "border-violet-500 bg-violet-500/15 text-violet-400"
          : "border-border bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ─── main dialog component ─────────────────────────────────────────────────
export interface ExportDialogProps {
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export function ExportDialog({ canvasContainerRef, onClose }: ExportDialogProps) {
  const [bg, setBg] = useState<Background>("white");
  const [format, setFormat] = useState<Format>("png");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shapes = useCanvasStore(s => s.canvas.shapes);

  const handleExport = useCallback(async () => {
    if (!canvasContainerRef.current) return;
    setExporting(true);
    setError(null);
    try {
      await runExport(canvasContainerRef.current, shapes, bg, format);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }, [canvasContainerRef, shapes, bg, format, onClose]);

  const bgPreviewStyle = {
    white: "bg-white border border-border",
    black: "bg-black",
    transparent: "bg-[length:16px_16px] bg-[position:0_0,8px_8px]",
  } as const;

  const transparentBg =
    "linear-gradient(45deg,#ccc 25%,transparent 25%) 0 0/16px 16px," +
    "linear-gradient(45deg,transparent 75%,#ccc 75%) 0 0/16px 16px," +
    "linear-gradient(45deg,transparent 25%,#ccc 25%) 8px 8px/16px 16px," +
    "linear-gradient(45deg,#ccc 75%,transparent 75%) 8px 8px/16px 16px";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-violet-400" />
              <h2 className="font-semibold text-foreground">Export Drawing</h2>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-accent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Background */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                Background
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["white", "black", "transparent"] as Background[]).map(option => (
                  <button
                    key={option}
                    onClick={() => setBg(option)}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      bg === option
                        ? "border-violet-500"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    {/* Swatch */}
                    <div
                      className="w-12 h-8 rounded-lg overflow-hidden"
                      style={
                        option === "transparent"
                          ? { background: transparentBg }
                          : { background: option === "white" ? "#ffffff" : "#000000" }
                      }
                    />
                    <span className="text-xs font-medium capitalize text-foreground">
                      {option}
                    </span>
                    {bg === option && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Color inversion note */}
              {bg !== "transparent" && (
                <p className="text-xs text-muted-foreground mt-2">
                  {bg === "white"
                    ? "White strokes will be inverted to dark for visibility."
                    : "Dark strokes will be inverted to white for visibility."}
                </p>
              )}
            </div>

            {/* Format */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                File Format
              </p>
              <div className="flex gap-2">
                <OptionBtn active={format === "png"} onClick={() => setFormat("png")}>
                  <ImageIcon className="w-4 h-4" />
                  PNG
                  <span className="text-xs opacity-60 font-normal">(lossless)</span>
                </OptionBtn>
                <OptionBtn active={format === "jpeg"} onClick={() => setFormat("jpeg")}>
                  <FileImage className="w-4 h-4" />
                  JPEG
                  <span className="text-xs opacity-60 font-normal">(smaller)</span>
                </OptionBtn>
              </div>
              {format === "jpeg" && bg === "transparent" && (
                <p className="text-xs text-amber-500 mt-2">
                  JPEG doesn't support transparency — a white background will be used.
                </p>
              )}
            </div>

            {/* Quality note */}
            <div className="rounded-lg bg-muted/40 border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Exported at <span className="text-foreground font-medium">2× resolution</span> for crisp results on retina displays. All shapes in the drawing will be included.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={exporting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={exporting || shapes.length === 0}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {exporting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Exporting…
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Export {format.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

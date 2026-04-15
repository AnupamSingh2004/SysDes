/**
 * Shape Renderer - Renders individual shapes as SVG elements
 */

"use client";

import React, { useMemo } from "react";
import { useTheme } from "next-themes";
import type { Shape, RectangleShape, EllipseShape, LineShape, ArrowShape, TextShape, FreedrawShape, IconShape } from "@/lib/canvas";
import { roughRectangle, roughEllipse, roughLine, roughArrow, roughFreedraw, generateHachureFill, generateCrossHatchFill } from "./rough";
import { getIconById } from "@/lib/icons/system-icons";

// Helper function to swap white/black based on theme
function getThemeAwareColor(color: string, isDark: boolean): string {
  const normalizedColor = color.toLowerCase().trim();

  // In light mode: white strokes should appear as black
  if (!isDark) {
    if (normalizedColor === "#ffffff" || normalizedColor === "#fff" || normalizedColor === "white") {
      return "#1e1e1e";
    }
  }

  // In dark mode: black strokes should appear as white
  if (isDark) {
    if (normalizedColor === "#000000" || normalizedColor === "#000" || normalizedColor === "black" || normalizedColor === "#1e1e1e") {
      return "#ffffff";
    }
  }

  return color;
}

interface ShapeRendererProps {
  shape: Shape;
  isSelected?: boolean;
  isHovered?: boolean;
}

export const ShapeRenderer = React.memo(function ShapeRenderer({ shape, isSelected: _isSelected, isHovered: _isHovered }: ShapeRendererProps) {
  // _isSelected and _isHovered can be used for visual feedback (outline, glow, etc.)
  void _isSelected;
  void _isHovered;

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Get theme-aware stroke color
  const themeAwareStrokeColor = useMemo(() =>
    getThemeAwareColor(shape.strokeColor, isDark),
    [shape.strokeColor, isDark]
  );

  const strokeDasharray = useMemo(() => {
    switch (shape.strokeStyle) {
      case "dashed": return "8,4";
      case "dotted": return "2,4";
      default: return undefined;
    }
  }, [shape.strokeStyle]);

  const commonProps = {
    stroke: themeAwareStrokeColor,
    strokeWidth: shape.strokeWidth,
    strokeDasharray,
    fill: shape.fillStyle === "none" ? "transparent" : shape.fillColor,
    opacity: shape.opacity,
    style: { transform: shape.angle !== 0 ? `rotate(${shape.angle * 180 / Math.PI}deg)` : undefined },
  };

  switch (shape.type) {
    case "rectangle":
      return <RectangleRenderer shape={shape} {...commonProps} />;
    case "ellipse":
      return <EllipseRenderer shape={shape} {...commonProps} />;
    case "line":
      return <LineRenderer shape={shape} {...commonProps} />;
    case "arrow":
      return <ArrowRenderer shape={shape} {...commonProps} />;
    case "text":
      return <TextRenderer shape={shape} {...commonProps} />;
    case "freedraw":
      return <FreedrawRenderer shape={shape} {...commonProps} />;
    case "icon":
      return <IconRenderer shape={shape} {...commonProps} />;
    default:
      return null;
  }
});

// ============================================
// Rectangle Renderer
// ============================================

interface RectangleRendererProps {
  shape: RectangleShape;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  fill: string;
  opacity: number;
}

function RectangleRenderer({ shape, stroke, strokeWidth, strokeDasharray, fill, opacity }: RectangleRendererProps) {
  const strokePath = useMemo(() => {
    if (shape.cornerRadius > 0 && shape.roughness === 0) {
      return null; // Use SVG rect for rounded corners with no roughness
    }
    const options = { roughness: shape.roughness, seed: shape.seed, bowing: 1, strokeIterations: 2 };
    return roughRectangle(shape.x, shape.y, shape.width, shape.height, options);
  }, [shape.x, shape.y, shape.width, shape.height, shape.cornerRadius, shape.roughness, shape.seed]);

  const fillPath = useMemo(() => {
    if (shape.fillStyle === "none" || shape.fillStyle === "solid") return null;

    const bounds = { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
    const options = { roughness: shape.roughness, seed: shape.seed, bowing: 1, strokeIterations: 2 };
    if (shape.fillStyle === "hachure") {
      return generateHachureFill(bounds, -45, 4 + shape.strokeWidth, options);
    }
    if (shape.fillStyle === "cross-hatch") {
      return generateCrossHatchFill(bounds, 4 + shape.strokeWidth, options);
    }
    return null;
  }, [shape.x, shape.y, shape.width, shape.height, shape.fillStyle, shape.roughness, shape.seed, shape.strokeWidth]);

  // For clean rounded rectangles
  if (shape.cornerRadius > 0 && shape.roughness === 0) {
    return (
      <g opacity={opacity}>
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={shape.cornerRadius}
          ry={shape.cornerRadius}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
      </g>
    );
  }

  return (
    <g opacity={opacity}>
      {/* Fill */}
      {shape.fillStyle === "solid" && (
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={fill}
          stroke="none"
        />
      )}
      {fillPath && (
        <path d={fillPath} stroke={fill} strokeWidth={1} fill="none" />
      )}
      {/* Stroke */}
      <path
        d={strokePath || ""}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

// ============================================
// Ellipse Renderer
// ============================================

interface EllipseRendererProps {
  shape: EllipseShape;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  fill: string;
  opacity: number;
}

function EllipseRenderer({ shape, stroke, strokeWidth, strokeDasharray, fill, opacity }: EllipseRendererProps) {
  const cx = shape.x + shape.width / 2;
  const cy = shape.y + shape.height / 2;
  const rx = shape.width / 2;
  const ry = shape.height / 2;
  const clipPathId = `ellipse-fill-clip-${shape.id}`;

  const strokePath = useMemo(() => {
    const options = { roughness: shape.roughness, seed: shape.seed, bowing: 1, strokeIterations: 2 };
    return roughEllipse(cx, cy, rx, ry, options);
  }, [cx, cy, rx, ry, shape.roughness, shape.seed]);

  const fillPath = useMemo(() => {
    if (shape.fillStyle === "none" || shape.fillStyle === "solid") return null;

    const bounds = { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
    const options = { roughness: shape.roughness, seed: shape.seed, bowing: 1, strokeIterations: 2 };
    if (shape.fillStyle === "hachure") {
      return generateHachureFill(bounds, -45, 4 + shape.strokeWidth, options);
    }
    if (shape.fillStyle === "cross-hatch") {
      return generateCrossHatchFill(bounds, 4 + shape.strokeWidth, options);
    }
    return null;
  }, [shape.x, shape.y, shape.width, shape.height, shape.fillStyle, shape.roughness, shape.seed, shape.strokeWidth]);

  return (
    <g opacity={opacity}>
      {/* Clip path for ellipse fill pattern */}
      <defs>
        <clipPath id={clipPathId}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
        </clipPath>
      </defs>
      {/* Fill */}
      {shape.fillStyle === "solid" && (
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} stroke="none" />
      )}
      {fillPath && (
        <path d={fillPath} stroke={fill} strokeWidth={1} fill="none" clipPath={`url(#${clipPathId})`} />
      )}
      {/* Stroke */}
      <path
        d={strokePath}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

// ============================================
// Line Renderer
// ============================================

interface LineRendererProps {
  shape: LineShape;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  opacity: number;
}

function LineRenderer({ shape, stroke, strokeWidth, strokeDasharray, opacity }: LineRendererProps) {
  const linePath = useMemo(() => {
    if (shape.points.length < 2) return "";
    const options = { roughness: shape.roughness, seed: shape.seed, bowing: 1, strokeIterations: 2 };

    let path = "";
    for (let i = 0; i < shape.points.length - 1; i++) {
      const p1 = shape.points[i];
      const p2 = shape.points[i + 1];
      path += roughLine(
        shape.x + p1.x,
        shape.y + p1.y,
        shape.x + p2.x,
        shape.y + p2.y,
        { ...options, seed: shape.seed + i }
      ) + " ";
    }
    return path;
  }, [shape.x, shape.y, shape.points, shape.roughness, shape.seed]);

  return (
    <g opacity={opacity}>
      <path
        d={linePath}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

// ============================================
// Arrow Renderer
// ============================================

interface ArrowRendererProps {
  shape: ArrowShape;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  opacity: number;
}

function ArrowRenderer({ shape, stroke, strokeWidth, strokeDasharray, opacity }: ArrowRendererProps) {
  const { linePath, arrowHeadPath } = useMemo(() => {
    if (shape.points.length < 2) return { linePath: "", arrowHeadPath: "" };
    const options = { roughness: shape.roughness, seed: shape.seed, bowing: 1, strokeIterations: 2 };

    let linePath = "";
    for (let i = 0; i < shape.points.length - 1; i++) {
      const p1 = shape.points[i];
      const p2 = shape.points[i + 1];
      linePath += roughLine(
        shape.x + p1.x,
        shape.y + p1.y,
        shape.x + p2.x,
        shape.y + p2.y,
        { ...options, seed: shape.seed + i }
      ) + " ";
    }

    // Arrow head at the end
    let arrowHeadPath = "";
    if (shape.endArrowhead !== "none" && shape.points.length >= 2) {
      const lastIdx = shape.points.length - 1;
      const p1 = shape.points[lastIdx - 1];
      const p2 = shape.points[lastIdx];

      const x1 = shape.x + p1.x;
      const y1 = shape.y + p1.y;
      const x2 = shape.x + p2.x;
      const y2 = shape.y + p2.y;

      const { arrowHead } = roughArrow(x1, y1, x2, y2, 10 + strokeWidth * 2, options);
      arrowHeadPath = arrowHead;
    }

    return { linePath, arrowHeadPath };
  }, [shape.x, shape.y, shape.points, shape.roughness, shape.seed, shape.endArrowhead, strokeWidth]);

  return (
    <g opacity={opacity}>
      <path
        d={linePath}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {arrowHeadPath && (
        <path
          d={arrowHeadPath}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

// ============================================
// Text Renderer
// ============================================

interface TextRendererProps {
  shape: TextShape;
  stroke: string;
  opacity: number;
}

function TextRenderer({ shape, stroke, opacity }: TextRendererProps) {
  const textAnchor = shape.textAlign === "left" ? "start" : shape.textAlign === "right" ? "end" : "middle";

  // Split text into lines
  const lines = shape.text.split("\n");
  const lineHeight = shape.lineHeight || 1.25;
  const lineSpacing = shape.fontSize * lineHeight;

  // Calculate starting position based on alignment
  let baseX = shape.x;
  if (shape.textAlign === "center") baseX += shape.width / 2;
  else if (shape.textAlign === "right") baseX += shape.width;

  // Calculate vertical position
  const totalTextHeight = lines.length * lineSpacing;
  let startY = shape.y;

  if (shape.verticalAlign === "middle") {
    startY = shape.y + (shape.height - totalTextHeight) / 2 + shape.fontSize * 0.8;
  } else if (shape.verticalAlign === "bottom") {
    startY = shape.y + shape.height - totalTextHeight + shape.fontSize * 0.8;
  } else {
    startY = shape.y + shape.fontSize * 0.8; // top alignment
  }

  // Show placeholder if empty
  if (!shape.text) {
    return (
      <text
        x={baseX}
        y={shape.y + shape.height / 2}
        fill={stroke}
        fontSize={shape.fontSize}
        fontFamily={shape.fontFamily}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        opacity={0.3}
      >
        Click to edit
      </text>
    );
  }

  return (
    <g opacity={opacity}>
      {lines.map((line, index) => (
        <text
          key={index}
          x={baseX}
          y={startY + index * lineSpacing}
          fill={stroke}
          fontSize={shape.fontSize}
          fontFamily={shape.fontFamily}
          textAnchor={textAnchor}
          dominantBaseline="auto"
        >
          {line || " "}
        </text>
      ))}
    </g>
  );
}

// ============================================
// Freedraw Renderer
// ============================================

interface FreedrawRendererProps {
  shape: FreedrawShape;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

function FreedrawRenderer({ shape, stroke, strokeWidth, opacity }: FreedrawRendererProps) {
  const pathData = useMemo(() => {
    if (shape.points.length < 2) return "";

    const absolutePoints = shape.points.map((p) => ({
      x: shape.x + p.x,
      y: shape.y + p.y,
    }));

    const options = { roughness: shape.roughness, seed: shape.seed, bowing: 1, strokeIterations: 1 };
    return roughFreedraw(absolutePoints, options);
  }, [shape.x, shape.y, shape.points, shape.roughness, shape.seed]);

  return (
    <g opacity={opacity}>
      <path
        d={pathData}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

// ============================================
// Icon Renderer
// ============================================

interface IconRendererProps {
  shape: IconShape;
  stroke: string;
  opacity: number;
}

function IconRenderer({ shape, stroke, opacity }: IconRendererProps) {
  const icon = getIconById(shape.iconId);

  if (!icon) {
    // Render a placeholder if icon not found
    return (
      <g
        transform={`translate(${shape.x}, ${shape.y})`}
        opacity={opacity}
      >
        <rect
          x={0}
          y={0}
          width={shape.width}
          height={shape.height}
          fill="none"
          stroke={stroke}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        <text
          x={shape.width / 2}
          y={shape.height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={stroke}
          fontSize={12}
        >
          ?
        </text>
      </g>
    );
  }

  const scale = shape.scale || 1;
  const iconSize = icon.defaultSize * scale;

  return (
    <g
      transform={`translate(${shape.x}, ${shape.y})`}
      opacity={opacity}
    >
      {/* Icon SVG */}
      <svg
        x={0}
        y={0}
        width={shape.width}
        height={shape.height}
        viewBox={icon.viewBox}
        preserveAspectRatio="xMidYMid meet"
      >
        <g
          fill={stroke}
          dangerouslySetInnerHTML={{ __html: icon.svg }}
        />
      </svg>
    </g>
  );
}

export default ShapeRenderer;


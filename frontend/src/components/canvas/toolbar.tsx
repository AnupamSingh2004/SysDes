"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  ArrowRight,
  Type,
  Database,
  Server,
  Cloud,
  Layers,
  LucideIcon,
} from "lucide-react";

interface Tool {
  id: string;
  icon: LucideIcon;
  label: string;
}

interface CanvasToolbarProps {
  selectedTool: string;
  onToolSelect: (toolId: string) => void;
}

const tools: Tool[] = [
  { id: "select", icon: MousePointer2, label: "Select (V)" },
  { id: "pan", icon: Hand, label: "Pan (H)" },
  { id: "rectangle", icon: Square, label: "Rectangle (R)" },
  { id: "circle", icon: Circle, label: "Circle (C)" },
  { id: "arrow", icon: ArrowRight, label: "Arrow (A)" },
  { id: "text", icon: Type, label: "Text (T)" },
];

const shapes: Tool[] = [
  { id: "server", icon: Server, label: "Server" },
  { id: "database", icon: Database, label: "Database" },
  { id: "cloud", icon: Cloud, label: "Cloud Service" },
  { id: "api", icon: Layers, label: "API Gateway" },
];

export function CanvasToolbar({ selectedTool, onToolSelect }: CanvasToolbarProps) {
  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
      {/* Drawing tools */}
      {tools.map((tool) => (
        <Button
          key={tool.id}
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${
            selectedTool === tool.id
              ? "bg-purple-500/20 text-purple-400"
              : "text-gray-400 hover:text-white"
          }`}
          onClick={() => onToolSelect(tool.id)}
          title={tool.label}
        >
          <tool.icon className="w-4 h-4" />
        </Button>
      ))}

      <Separator orientation="vertical" className="h-6 bg-white/10 mx-1" />

      {/* Component shapes */}
      {shapes.map((shape) => (
        <Button
          key={shape.id}
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${
            selectedTool === shape.id
              ? "bg-purple-500/20 text-purple-400"
              : "text-gray-400 hover:text-white"
          }`}
          onClick={() => onToolSelect(shape.id)}
          title={shape.label}
        >
          <shape.icon className="w-4 h-4" />
        </Button>
      ))}
    </div>
  );
}

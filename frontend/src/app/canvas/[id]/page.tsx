"use client";

import { useState, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  ChevronLeft,
  Download,
  Share2,
  Sparkles,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  MousePointer2,
  Hand,
  Square,
  Circle,
  ArrowRight,
  Type,
  Database,
  Server,
  Cloud,
  MessageSquare,
  X,
  Check,
  Loader2,
  History,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Mock suggestions from AI
const mockSuggestions = [
  {
    id: "1",
    type: "scalability",
    title: "Add Load Balancer",
    description: "Consider adding a load balancer before your API servers to distribute traffic evenly.",
    priority: "high",
  },
  {
    id: "2",
    type: "security",
    title: "Implement Rate Limiting",
    description: "Add rate limiting to prevent abuse and protect your services from DDoS attacks.",
    priority: "medium",
  },
  {
    id: "3",
    type: "performance",
    title: "Add Caching Layer",
    description: "Introduce Redis caching between API and database to reduce latency.",
    priority: "high",
  },
];

// Tools available in the toolbar
const tools = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "pan", icon: Hand, label: "Pan" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "arrow", icon: ArrowRight, label: "Arrow" },
  { id: "text", icon: Type, label: "Text" },
];

// Component shapes
const shapes = [
  { id: "server", icon: Server, label: "Server" },
  { id: "database", icon: Database, label: "Database" },
  { id: "cloud", icon: Cloud, label: "Cloud" },
  { id: "api", icon: Layers, label: "API" },
];

export default function CanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [projectName, setProjectName] = useState(id === "new" ? "Untitled Project" : "E-commerce Platform");
  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedTool, setSelectedTool] = useState("select");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [zoom, setZoom] = useState(100);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsAnalyzing(false);
  };

  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      {/* Top toolbar */}
      <header className="h-14 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0">
        {/* Left section */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>

          {isEditingName ? (
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
              className="w-64 h-8 bg-white/5 border-white/10 focus:border-purple-500"
              autoFocus
            />
          ) : (
            <button 
              onClick={() => setIsEditingName(true)}
              className="text-sm font-medium hover:text-purple-400 transition-colors"
            >
              {projectName}
            </button>
          )}

          <Badge variant="outline" className="text-xs border-white/10 text-gray-500">
            Saved
          </Badge>
        </div>

        {/* Center section - Tools */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
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
              onClick={() => setSelectedTool(tool.id)}
              title={tool.label}
            >
              <tool.icon className="w-4 h-4" />
            </Button>
          ))}
          
          <Separator orientation="vertical" className="h-6 bg-white/10 mx-1" />
          
          {shapes.map((shape) => (
            <Button
              key={shape.id}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-white"
              title={shape.label}
            >
              <shape.icon className="w-4 h-4" />
            </Button>
          ))}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-gray-400 hover:text-white"
              onClick={() => setZoom(Math.max(25, zoom - 25))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-gray-400 w-12 text-center">{zoom}%</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-gray-400 hover:text-white"
              onClick={() => setZoom(Math.min(200, zoom + 25))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6 bg-white/10" />

          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
            <Undo className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
            <Redo className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 bg-white/10" />

          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
            <History className="w-4 h-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
                <Download className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#111111] border-white/10 text-white">
              <DropdownMenuItem className="text-gray-300 focus:text-white focus:bg-white/5">
                Export as PNG
              </DropdownMenuItem>
              <DropdownMenuItem className="text-gray-300 focus:text-white focus:bg-white/5">
                Export as SVG
              </DropdownMenuItem>
              <DropdownMenuItem className="text-gray-300 focus:text-white focus:bg-white/5">
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
            <Share2 className="w-4 h-4" />
          </Button>

          <Button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-8"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {isAnalyzing ? "Analyzing..." : "Analyze"}
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-gray-400 hover:text-white"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Canvas background with grid */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(circle at center, rgba(139, 92, 246, 0.03) 0%, transparent 70%),
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
              `,
              backgroundSize: "100% 100%, 20px 20px, 20px 20px",
            }}
          />

          {/* Empty state / placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Layers className="w-10 h-10 text-purple-400/50" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-gray-300">Start designing</h3>
              <p className="text-gray-500 text-sm max-w-xs">
                Drag shapes from the toolbar or draw freely on the canvas
              </p>
            </div>
          </div>

          {/* Zoom indicator */}
          <div className="absolute bottom-4 left-4 text-xs text-gray-500 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
            {zoom}%
          </div>
        </div>

        {/* AI Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-white/5 bg-[#0d0d0d] overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h2 className="font-semibold">AI Suggestions</h2>
                </div>
                <p className="text-xs text-gray-500">
                  Smart recommendations for your design
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {mockSuggestions.map((suggestion) => (
                  <SuggestionCard key={suggestion.id} suggestion={suggestion} />
                ))}
              </div>

              {/* AI Chat input */}
              <div className="p-4 border-t border-white/5">
                <div className="relative">
                  <Input
                    placeholder="Ask AI about your design..."
                    className="pr-10 bg-white/5 border-white/10 focus:border-purple-500"
                  />
                  <Button 
                    size="icon" 
                    className="absolute right-1 top-1 h-7 w-7 bg-purple-500 hover:bg-purple-600"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Suggestion card component
function SuggestionCard({ suggestion }: { suggestion: typeof mockSuggestions[0] }) {
  const priorityColors = {
    high: "text-red-400 bg-red-500/10 border-red-500/20",
    medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    low: "text-green-400 bg-green-500/10 border-green-500/20",
  };

  const typeIcons = {
    scalability: Server,
    security: Layers,
    performance: Sparkles,
  };

  const Icon = typeIcons[suggestion.type as keyof typeof typeIcons] || Sparkles;

  return (
    <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium truncate">{suggestion.title}</h4>
            <Badge 
              variant="outline" 
              className={`text-[10px] px-1.5 py-0 ${priorityColors[suggestion.priority as keyof typeof priorityColors]}`}
            >
              {suggestion.priority}
            </Badge>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {suggestion.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 px-2">
              <Check className="w-3 h-3 mr-1" />
              Apply
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-400 hover:text-white px-2">
              <X className="w-3 h-3 mr-1" />
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Canvas Page - Project whiteboard with custom canvas
 */

"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Save, Share2, Settings, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CustomCanvas, CanvasToolbar, StylePanel, TextStylePanel, useCanvasStore } from "@/components/canvas";
import { Logo } from "@/components/shared";
import { api, Project, Suggestion } from "@/lib/api";
import { useAuthContext } from "@/providers/auth-provider";

// Mock suggestions
const mockSuggestions: Suggestion[] = [
  {
    id: "1",
    type: "scalability",
    title: "Add Load Balancer",
    description: "Consider adding a load balancer before your API servers.",
    priority: "high",
  },
  {
    id: "2",
    type: "security",
    title: "Implement Rate Limiting",
    description: "Add rate limiting to prevent abuse.",
    priority: "medium",
  },
];

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthContext();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAISidebar, setShowAISidebar] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(true);
  const [suggestions] = useState<Suggestion[]>(mockSuggestions);

  const projectId = params.id as string;

  // Load project
  useEffect(() => {
    async function loadProject() {
      if (!projectId) return;
      
      // Wait for auth to finish loading
      if (authLoading) return;

      // If not authenticated, redirect to login
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const data = await api.getProject(projectId);
        setProject(data);
        setError(null);
      } catch (err) {
        console.error("Failed to load project:", err);
        setError("Failed to load project. It may not exist or you don't have access.");
        // Don't redirect immediately - show error instead
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [projectId, user, authLoading, router]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!project) return;

    try {
      const { shapes, scrollX, scrollY, zoom } = useCanvasStore.getState().canvas;
      
      // Save canvas data to project
      // TODO: Add data field to Project type when backend supports it
      console.log("Saving canvas state:", { shapes: shapes.length, viewport: { scrollX, scrollY, zoom } });
      await api.updateProject(project.id, {
        name: project.name, // Keep existing name
      });
      
      console.log("Project saved");
    } catch (error) {
      console.error("Failed to save:", error);
    }
  }, [project]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <Logo size="sm" />
          <div className="h-6 w-px bg-zinc-700" />
          <span className="text-white font-medium">{project?.name || "Untitled"}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white"
            onClick={() => setShowAISidebar(!showAISidebar)}
          >
            <Sparkles size={18} className="mr-2" />
            AI Assistant
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white"
            onClick={() => setShowStylePanel(!showStylePanel)}
          >
            <Settings size={18} className="mr-2" />
            Style
          </Button>
          <div className="h-6 w-px bg-zinc-700" />
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
            <Share2 size={18} className="mr-2" />
            Share
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSave}
          >
            <Save size={18} className="mr-2" />
            Save
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Toolbar */}
        <div className="absolute top-4 left-4 z-10">
          <CanvasToolbar />
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <CustomCanvas className="w-full h-full" />
        </div>

        {/* Right Style Panels */}
        {showStylePanel && (
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-3">
            <StylePanel />
            <TextStylePanel />
          </div>
        )}

        {/* AI Sidebar */}
        {showAISidebar && (
          <div className="w-80 border-l border-zinc-800 bg-zinc-900/95 backdrop-blur overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h2 className="font-semibold text-white">AI Suggestions</h2>
              </div>
              <button onClick={() => setShowAISidebar(false)} className="text-zinc-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {suggestions.map((s) => (
                <div key={s.id} className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      s.priority === "high" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {s.priority}
                    </span>
                    <span className="text-xs text-zinc-500">{s.type}</span>
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1">{s.title}</h3>
                  <p className="text-xs text-zinc-400">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

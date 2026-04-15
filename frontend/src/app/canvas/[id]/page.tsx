/**
 * Canvas Page - Project whiteboard with custom canvas
 */

"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import { ArrowLeft, Save, Share2, Settings, Sparkles, X, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CustomCanvas, CanvasToolbar, StylePanel, TextStylePanel, useCanvasStore } from "@/components/canvas";
import { Logo } from "@/components/shared";
import { api, Project, Suggestion, Whiteboard, CanvasDocument } from "@/lib/api";
import { interpretSketch, captureCanvasFromContainer, InterpretResponse } from "@/lib/ai-service";
import { analyzeDesign, AnalyzeResponse, RuleSuggestion, getSeverityColor } from "@/lib/rules-service";
import { useAuthContext } from "@/providers/auth-provider";
import type { Shape } from "@/lib/canvas";

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
  const [whiteboard, setWhiteboard] = useState<Whiteboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showAISidebar, setShowAISidebar] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(true);
  const [suggestions] = useState<Suggestion[]>(mockSuggestions);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiResults, setAiResults] = useState<InterpretResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [rulesResults, setRulesResults] = useState<AnalyzeResponse | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const lastSaveRef = useRef<number>(0);

  const projectId = params.id as string;

  // Load project and whiteboard
  useEffect(() => {
    async function loadProjectAndWhiteboard() {
      if (!projectId) return;

      // Wait for auth to finish loading
      if (authLoading) return;

      // If not authenticated, redirect to login
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        // Load project
        const data = await api.getProject(projectId);
        setProject(data);

        // Load whiteboard (creates default if none exists)
        try {
          const wb = await api.getDefaultWhiteboard(projectId);
          setWhiteboard(wb);

          // Load canvas data from whiteboard
          if (wb.data && typeof wb.data === 'object') {
            const canvasData = wb.data as CanvasDocument;
            const store = useCanvasStore.getState();

            // Load shapes if available
            if (canvasData.shapes && Array.isArray(canvasData.shapes)) {
              // Type assertion via unknown for JSON data from backend
              store.loadDocument(canvasData.shapes as unknown as Shape[]);
            }

            // Load viewport if available
            if (canvasData.viewport) {
              store.setScroll(canvasData.viewport.scrollX || 0, canvasData.viewport.scrollY || 0);
              store.setZoom(canvasData.viewport.zoom || 1);
            }

            // Load style if available
            if (canvasData.style) {
              // Type assertion for JSON data
              store.setStyle(canvasData.style as unknown as Parameters<typeof store.setStyle>[0]);
            }
          }
        } catch (wbError) {
          // Whiteboard failed to load, but project loaded - continue with empty canvas
          console.warn("Failed to load whiteboard, starting with empty canvas:", wbError);
        }

        setError(null);
      } catch (err) {
        console.error("Failed to load project:", err);
        setError("Failed to load project. It may not exist or you don't have access.");
        // Don't redirect immediately - show error instead
      } finally {
        setLoading(false);
      }
    }

    loadProjectAndWhiteboard();
  }, [projectId, user, authLoading, router]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!project || saving) return;

    // Debounce saves
    const now = Date.now();
    if (now - lastSaveRef.current < 1000) return;
    lastSaveRef.current = now;

    setSaving(true);
    setSaveStatus('saving');

    try {
      const { shapes, scrollX, scrollY, zoom, currentStyle } = useCanvasStore.getState().canvas;

      // Create canvas document
      const canvasData: CanvasDocument = {
        version: 1,
        shapes: shapes as unknown as CanvasDocument['shapes'],
        viewport: { scrollX, scrollY, zoom },
        style: currentStyle as unknown as CanvasDocument['style'],
        createdAt: whiteboard?.data ? (whiteboard.data as CanvasDocument).createdAt || Date.now() : Date.now(),
        updatedAt: Date.now(),
      };

      // Save canvas data to backend
      const updatedWhiteboard = await api.saveCanvas(project.id, canvasData);
      setWhiteboard(updatedWhiteboard);

      setSaveStatus('saved');
      console.log("Canvas saved:", { shapes: shapes.length, viewport: { scrollX, scrollY, zoom } });

      // Reset save status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error("Failed to save:", error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  }, [project, whiteboard, saving]);

  // Auto-save when shapes change (debounced)
  useEffect(() => {
    if (!project || loading) return;

    let timeoutId: NodeJS.Timeout | null = null;
    let lastShapeCount = useCanvasStore.getState().canvas.shapes.length;

    // Subscribe to store changes
    const unsubscribe = useCanvasStore.subscribe((state) => {
      const currentShapeCount = state.canvas.shapes.length;

      // Only auto-save if shapes have changed
      if (currentShapeCount !== lastShapeCount) {
        lastShapeCount = currentShapeCount;

        // Clear previous timeout
        if (timeoutId) clearTimeout(timeoutId);

        // Debounce auto-save by 3 seconds after last change
        timeoutId = setTimeout(() => {
          handleSave();
        }, 3000);
      }
    });

    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [project, loading, handleSave]);

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

  // Handle AI interpretation
  const handleAIInterpret = useCallback(async () => {
    setAiProcessing(true);
    setAiError(null);
    setRulesResults(null);

    try {
      // Get canvas container and capture SVG
      const container = canvasContainerRef.current;
      if (!container) {
        throw new Error("Canvas container not found");
      }

      const image = await captureCanvasFromContainer(container);

      // Send to AI for interpretation
      const results = await interpretSketch(image, `System design diagram for ${project?.name || "untitled project"}`);

      setAiResults(results);
      setShowAISidebar(true);

      // If we got nodes, run rules analysis
      if (results.nodes && results.nodes.length > 0) {
        try {
          const rulesResponse = await analyzeDesign(
            results.nodes.map(n => ({
              id: n.id,
              type: n.type,
              label: n.label,
              description: n.description,
              position: n.position,
              properties: n.properties as Record<string, unknown>,
            })),
            results.edges.map(e => ({
              id: e.id,
              source: e.source,
              target: e.target,
              type: e.type,
              label: e.label,
              properties: e.properties as Record<string, unknown>,
              style: e.style,
            }))
          );
          setRulesResults(rulesResponse);
          console.log("Rules Analysis Results:", rulesResponse);
        } catch (rulesError) {
          console.error("Rules Analysis Error:", rulesError);
        }
      }

      console.log("AI Interpretation Results:", results);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to interpret sketch";
      setAiError(message);
      console.error("AI Interpretation Error:", error);
    } finally {
      setAiProcessing(false);
    }
  }, [project?.name]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
    <div className="h-screen w-screen overflow-hidden bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <Logo size="sm" />
          <div className="h-6 w-px bg-border" />
          <span className="text-foreground font-medium">{project?.name || "Untitled"}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={handleAIInterpret}
            disabled={aiProcessing}
          >
            {aiProcessing ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles size={18} className="mr-2" />
                Interpret
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setShowAISidebar(!showAISidebar)}
          >
            <Sparkles size={18} className="mr-2" />
            AI Assistant
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setShowStylePanel(!showStylePanel)}
          >
            <Settings size={18} className="mr-2" />
            Style
          </Button>
          <div className="h-6 w-px bg-border" />
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Share2 size={18} className="mr-2" />
            Share
          </Button>
          <Button
            size="sm"
            className={`min-w-[100px] transition-all ${saveStatus === 'saved'
              ? 'bg-green-600 hover:bg-green-700'
              : saveStatus === 'error'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            onClick={handleSave}
            disabled={saving}
          >
            {saveStatus === 'saving' ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Check size={18} className="mr-2" />
                Saved!
              </>
            ) : saveStatus === 'error' ? (
              <>
                <X size={18} className="mr-2" />
                Error
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Save
              </>
            )}
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
        <div ref={canvasContainerRef} className="flex-1 relative">
          <CustomCanvas className="w-full h-full" />
        </div>

        {/* Right Style Panels - Side by side horizontally */}
        {showStylePanel && (
          <div
            className="absolute top-4 z-10 flex flex-row items-start gap-3 transition-all duration-300"
            style={{ right: showAISidebar ? 'calc(320px + 16px)' : '16px' }}
          >
            <TextStylePanel />
            <StylePanel />
          </div>
        )}

        {/* AI Sidebar */}
        {showAISidebar && (
          <div className="w-80 border-l border-border bg-card/95 backdrop-blur overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h2 className="font-semibold text-foreground">AI Analysis</h2>
              </div>
              <button onClick={() => setShowAISidebar(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* AI Error */}
              {aiError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{aiError}</p>
                </div>
              )}

              {/* AI Results */}
              {aiResults && (
                <>
                  {/* Confidence Score */}
                  <div className="p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Overall Confidence</span>
                      <span className="text-sm font-medium text-foreground">
                        {Math.round(aiResults.overall_confidence * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${aiResults.overall_confidence * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Detected Patterns */}
                  {aiResults.patterns_detected.length > 0 && (
                    <div className="p-3 bg-muted/50 rounded-lg border border-border">
                      <h3 className="text-xs font-medium text-muted-foreground mb-2">Patterns Detected</h3>
                      <div className="flex flex-wrap gap-1">
                        {aiResults.patterns_detected.map((pattern, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                            {pattern}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nodes */}
                  <div className="p-3 bg-muted/50 rounded-lg border border-border">
                    <h3 className="text-xs font-medium text-muted-foreground mb-2">Components ({aiResults.nodes.length})</h3>
                    <div className="space-y-2">
                      {aiResults.nodes.map((node) => (
                        <div key={node.id} className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                            {node.type}
                          </span>
                          <span className="text-sm text-foreground">{node.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Edges */}
                  {aiResults.edges.length > 0 && (
                    <div className="p-3 bg-muted/50 rounded-lg border border-border">
                      <h3 className="text-xs font-medium text-muted-foreground mb-2">Connections ({aiResults.edges.length})</h3>
                      <div className="space-y-2">
                        {aiResults.edges.map((edge) => (
                          <div key={edge.id} className="text-xs text-muted-foreground">
                            <span className="text-foreground">{edge.source}</span>
                            {" → "}
                            <span className="text-foreground">{edge.target}</span>
                            {edge.label && <span className="ml-2 text-blue-400">({edge.label})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ambiguities */}
                  {aiResults.ambiguities && aiResults.ambiguities.length > 0 && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <h3 className="text-xs font-medium text-yellow-400 mb-2">Needs Clarification</h3>
                      <ul className="space-y-1">
                        {aiResults.ambiguities.map((item, i) => (
                          <li key={i} className="text-xs text-yellow-400/80">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* Rules Engine Suggestions */}
              {rulesResults && rulesResults.suggestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-muted-foreground">Design Suggestions</h3>
                    <div className="flex gap-1">
                      {rulesResults.critical_count > 0 && (
                        <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                          {rulesResults.critical_count} critical
                        </span>
                      )}
                      {rulesResults.warning_count > 0 && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                          {rulesResults.warning_count} warnings
                        </span>
                      )}
                    </div>
                  </div>
                  {rulesResults.suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className={`p-3 rounded-lg border ${getSeverityColor(suggestion.severity)}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium capitalize">
                          {suggestion.severity}
                        </span>
                        <span className="text-xs opacity-70">{suggestion.category}</span>
                      </div>
                      <h4 className="text-sm font-medium mb-1">{suggestion.title}</h4>
                      <p className="text-xs opacity-80 mb-2">{suggestion.description}</p>
                      <div className="text-xs p-2 bg-black/10 rounded">
                        <span className="font-medium">Recommendation: </span>
                        {suggestion.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Default suggestions when no AI results */}
              {!aiResults && !aiError && !rulesResults && suggestions.map((s) => (
                <div key={s.id} className="p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${s.priority === "high" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                      {s.priority}
                    </span>
                    <span className="text-xs text-muted-foreground">{s.type}</span>
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-1">{s.title}</h3>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

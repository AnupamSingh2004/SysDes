"use client";

import { useCallback } from "react";
import {
  Tldraw,
  Editor,
  getSnapshot,
  loadSnapshot,
  TLEditorSnapshot,
} from "tldraw";
import "tldraw/tldraw.css";

interface WhiteboardCanvasProps {
  projectId: string;
  initialSnapshot?: TLEditorSnapshot;
  onSave?: (snapshot: TLEditorSnapshot) => void;
  onEditorReady?: (editor: Editor) => void;
}

export function WhiteboardCanvas({
  projectId,
  initialSnapshot,
  onSave,
  onEditorReady,
}: WhiteboardCanvasProps) {
  
  // Handle editor mount
  const handleMount = useCallback(
    (editor: Editor) => {
      // Set dark mode via CSS class
      editor.updateInstanceState({ isDebugMode: false });
      
      // Load initial snapshot if provided
      if (initialSnapshot) {
        try {
          loadSnapshot(editor.store, initialSnapshot);
        } catch (e) {
          console.error("Failed to load snapshot:", e);
        }
      }

      // Notify parent that editor is ready
      if (onEditorReady) {
        onEditorReady(editor);
      }

      // Set up auto-save on changes (debounced)
      let saveTimeout: NodeJS.Timeout | null = null;
      const unsub = editor.store.listen(
        () => {
          if (saveTimeout) clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
            if (onSave) {
              const snapshot = getSnapshot(editor.store);
              onSave(snapshot);
            }
          }, 2000); // Auto-save after 2 seconds of inactivity
        },
        { source: "user", scope: "document" }
      );

      return () => {
        unsub();
        if (saveTimeout) clearTimeout(saveTimeout);
      };
    },
    [initialSnapshot, onSave, onEditorReady]
  );

  return (
    <div className="w-full h-full tldraw-container">
      <Tldraw
        onMount={handleMount}
        persistenceKey={`sysdes-project-${projectId}`}
      />
      <style jsx global>{`
        .tldraw-container {
          --color-background: #0a0a0a;
          --color-panel: #111111;
          --color-low: #1a1a1a;
          --color-muted-1: #333333;
          --color-hint: #666666;
          --color-text: #ffffff;
          --color-primary: #a855f7;
          --color-accent: #ec4899;
          --color-selection-stroke: #a855f7;
          --color-selection-fill: rgba(168, 85, 247, 0.1);
        }
        
        .tldraw-container .tl-background {
          background-color: #0a0a0a !important;
        }
        
        .tldraw-container [data-state] {
          background-color: var(--color-panel);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .tldraw-container .tlui-layout {
          background: transparent;
        }

        .tldraw-container .tlui-toolbar__inner {
          background-color: rgba(17, 17, 17, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
        }

        .tldraw-container .tlui-style-panel__wrapper {
          background-color: rgba(17, 17, 17, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
        }

        .tldraw-container .tlui-menu__content,
        .tldraw-container .tlui-popover__content {
          background-color: #111111;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tldraw-container .tlui-button {
          color: #d1d5db;
        }

        .tldraw-container .tlui-button:hover {
          background-color: rgba(255, 255, 255, 0.05);
          color: #ffffff;
        }

        .tldraw-container .tlui-button[data-state="selected"] {
          background-color: rgba(168, 85, 247, 0.2);
          color: #a855f7;
        }
        
        .tldraw-container .tlui-navigation-zone,
        .tldraw-container .tlui-menu-zone {
          background-color: rgba(17, 17, 17, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
        }
        
        .tldraw-container .tlui-page-menu__name {
          color: #ffffff;
        }
        
        /* Hide default keyboard shortcuts panel for cleaner look */
        .tldraw-container .tlui-help-menu {
          display: none;
        }
      `}</style>
    </div>
  );
}

export default WhiteboardCanvas;

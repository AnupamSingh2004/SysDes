"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuggestionCard } from "@/components/cards";
import { Suggestion } from "@/types";

interface AISidebarProps {
  isOpen: boolean;
  suggestions: Suggestion[];
  onApplySuggestion?: (id: string) => void;
  onDismissSuggestion?: (id: string) => void;
  onAskAI?: (question: string) => void;
}

export function AISidebar({
  isOpen,
  suggestions,
  onApplySuggestion,
  onDismissSuggestion,
  onAskAI,
}: AISidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 360, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-l border-white/5 bg-[#0d0d0d] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h2 className="font-semibold">AI Suggestions</h2>
            </div>
            <p className="text-xs text-gray-500">
              Smart recommendations for your design
            </p>
          </div>

          {/* Suggestions list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {suggestions.length > 0 ? (
              suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onApply={onApplySuggestion}
                  onDismiss={onDismissSuggestion}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-gray-500" />
                </div>
                <p className="text-sm text-gray-400 mb-1">No suggestions yet</p>
                <p className="text-xs text-gray-500">
                  Click &quot;Analyze&quot; to get AI recommendations
                </p>
              </div>
            )}
          </div>

          {/* AI Chat input */}
          <div className="p-4 border-t border-white/5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.querySelector("input");
                if (input && input.value.trim() && onAskAI) {
                  onAskAI(input.value.trim());
                  input.value = "";
                }
              }}
            >
              <div className="relative">
                <Input
                  placeholder="Ask AI about your design..."
                  className="pr-10 bg-white/5 border-white/10 focus:border-purple-500"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7 bg-purple-500 hover:bg-purple-600"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

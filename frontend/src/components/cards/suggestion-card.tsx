"use client";

import { Check, X, Server, Layers, Sparkles, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Suggestion } from "@/types";

interface SuggestionCardProps {
  suggestion: Suggestion;
  onApply?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const priorityColors = {
  high: "text-red-400 bg-red-500/10 border-red-500/20",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  low: "text-green-400 bg-green-500/10 border-green-500/20",
};

const typeIcons: Record<string, LucideIcon> = {
  scalability: Server,
  security: Layers,
  performance: Sparkles,
  reliability: Server,
  cost: Layers,
  "best-practice": Sparkles,
};

export function SuggestionCard({ suggestion, onApply, onDismiss }: SuggestionCardProps) {
  const Icon = typeIcons[suggestion.type] || Sparkles;

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
              className={`text-[10px] px-1.5 py-0 ${priorityColors[suggestion.priority]}`}
            >
              {suggestion.priority}
            </Badge>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {suggestion.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {onApply && !suggestion.applied && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onApply(suggestion.id)}
                className="h-7 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 px-2"
              >
                <Check className="w-3 h-3 mr-1" />
                Apply
              </Button>
            )}
            {onDismiss && !suggestion.dismissed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(suggestion.id)}
                className="h-7 text-xs text-gray-400 hover:text-white px-2"
              >
                <X className="w-3 h-3 mr-1" />
                Dismiss
              </Button>
            )}
            {suggestion.applied && (
              <span className="text-xs text-green-400">✓ Applied</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

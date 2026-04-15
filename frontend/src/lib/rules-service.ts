/**
 * Rules Service - Client for design analysis using heuristic rules
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Types matching backend
export interface RuleNode {
    id: string;
    type: string;
    label: string;
    description?: string;
    position: { x: number; y: number };
    properties?: Record<string, unknown>;
}

export interface RuleEdge {
    id: string;
    source: string;
    target: string;
    type: string;
    label?: string;
    properties?: Record<string, unknown>;
    style: string;
}

export interface RuleSuggestion {
    id: string;
    rule_id: string;
    category: 'scalability' | 'security' | 'reliability' | 'performance' | 'maintainability' | 'cost';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    recommendation: string;
    affected_nodes?: string[];
    impact_score: number;
    complexity_score: number;
}

export interface AnalyzeResponse {
    suggestions: RuleSuggestion[];
    total_score: number;
    critical_count: number;
    warning_count: number;
    info_count: number;
}

/**
 * Analyze design using heuristic rules engine
 */
export async function analyzeDesign(
    nodes: RuleNode[],
    edges: RuleEdge[]
): Promise<AnalyzeResponse> {
    const response = await fetch(`${API_URL}/rules/analyze`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ nodes, edges }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to analyze design');
    }

    return response.json();
}

/**
 * Get severity color classes
 */
export function getSeverityColor(severity: string): string {
    switch (severity) {
        case 'critical':
            return 'bg-red-500/20 text-red-400 border-red-500/30';
        case 'warning':
            return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case 'info':
            return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        default:
            return 'bg-muted text-muted-foreground';
    }
}

/**
 * Get category icon name
 */
export function getCategoryIcon(category: string): string {
    switch (category) {
        case 'security':
            return 'Shield';
        case 'scalability':
            return 'TrendingUp';
        case 'reliability':
            return 'Server';
        case 'performance':
            return 'Zap';
        case 'maintainability':
            return 'Wrench';
        case 'cost':
            return 'DollarSign';
        default:
            return 'AlertCircle';
    }
}

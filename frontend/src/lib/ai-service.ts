/**
 * AI Service - Client for canvas interpretation and suggestions
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Types matching backend
export interface ExtractedNode {
    id: string;
    type: 'service' | 'database' | 'queue' | 'cache' | 'gateway' | 'client' | 'external' | 'container' | 'load_balancer';
    label: string;
    description?: string;
    position: { x: number; y: number };
    properties?: Record<string, unknown>;
    confidence: number;
}

export interface ExtractedEdge {
    id: string;
    source: string;
    target: string;
    type: 'sync' | 'async' | 'realtime' | 'batch' | 'unknown';
    label?: string;
    properties?: Record<string, unknown>;
    style: 'solid' | 'dashed' | 'dotted';
    confidence: number;
    assumed: boolean;
}

export interface InterpretResponse {
    nodes: ExtractedNode[];
    edges: ExtractedEdge[];
    patterns_detected: string[];
    overall_confidence: number;
    ambiguities?: string[];
}

export interface Suggestion {
    category: 'scalability' | 'security' | 'reliability' | 'performance' | 'maintainability' | 'cost';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    affected_nodes?: string[];
    recommendation: string;
    impact_score: number;
    complexity_score: number;
}

export interface SuggestResponse {
    suggestions: Suggestion[];
}

/**
 * Convert canvas to base64 image for AI interpretation
 */
export async function captureCanvasAsBase64(svgElement: SVGSVGElement): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            // Clone the SVG to avoid modifying the original
            const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

            // Set explicit dimensions
            const bbox = svgElement.getBBox();
            const width = Math.max(svgElement.clientWidth || 1024, bbox.x + bbox.width + 100);
            const height = Math.max(svgElement.clientHeight || 768, bbox.y + bbox.height + 100);

            clonedSvg.setAttribute('width', String(width));
            clonedSvg.setAttribute('height', String(height));
            clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

            // Add a white background rect
            const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bgRect.setAttribute('width', '100%');
            bgRect.setAttribute('height', '100%');
            bgRect.setAttribute('fill', '#f5f5f5');
            clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

            // Serialize the SVG
            const svgData = new XMLSerializer().serializeToString(clonedSvg);

            // Create a proper data URL for the SVG
            const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
            const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

            // Create an image from the SVG
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                // Create a canvas to draw the image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Fill with light gray background (so we can see white strokes)
                ctx.fillStyle = '#f5f5f5';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw the SVG
                ctx.drawImage(img, 0, 0);

                // Convert to base64 (remove the data:image/png;base64, prefix)
                const base64 = canvas.toDataURL('image/png').split(',')[1];

                console.log('Captured canvas image, size:', base64.length, 'chars');
                resolve(base64);
            };

            img.onerror = (e) => {
                console.error('Failed to load SVG image:', e);
                reject(new Error('Failed to load SVG image'));
            };

            img.src = dataUrl;
        } catch (error) {
            console.error('Canvas capture error:', error);
            reject(error);
        }
    });
}

/**
 * Capture canvas from a container element
 */
export async function captureCanvasFromContainer(container: HTMLElement): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            // Use html2canvas if available, or fall back to manual approach
            const svg = container.querySelector('svg');
            if (svg) {
                captureCanvasAsBase64(svg as SVGSVGElement)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            // If no SVG, try to capture the container as an image
            // This is a fallback - ideally we should use the SVG
            reject(new Error('No SVG element found in container'));
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Send canvas to AI for interpretation
 */
export async function interpretSketch(
    image: string,
    explanation: string = ""
): Promise<InterpretResponse> {
    const response = await fetch(`${API_URL}/ai/interpret`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ image, explanation }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to interpret sketch');
    }

    return response.json();
}

/**
 * Get design suggestions for nodes/edges
 */
export async function getSuggestions(
    nodes: ExtractedNode[],
    edges: ExtractedEdge[],
    context: string = ""
): Promise<SuggestResponse> {
    const response = await fetch(`${API_URL}/ai/suggest`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ nodes, edges, context }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to get suggestions');
    }

    return response.json();
}

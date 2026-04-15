package ai

// SketchInterpretationPrompt is the prompt template for extracting nodes/edges from a sketch
const SketchInterpretationPrompt = `You are an expert system architect analyzing a hand-drawn architecture sketch.

## Your Task
Analyze the provided sketch image and extract:
1. All system components (services, databases, queues, caches, etc.)
2. All connections between components
3. The overall architecture pattern

## Input Context
User's explanation: %s

## Output Format
Return a JSON object with this exact structure (no markdown, just pure JSON):
{
  "nodes": [
    {
      "id": "unique_id",
      "type": "service|database|queue|cache|gateway|client|external|container|load_balancer",
      "label": "Component Name",
      "description": "Brief description of purpose",
      "position": {"x": 0, "y": 0},
      "properties": {
        "technology": "Detected or inferred technology",
        "containerized": true,
        "replicated": false
      },
      "confidence": 0.95
    }
  ],
  "edges": [
    {
      "id": "unique_id",
      "source": "node_id",
      "target": "node_id",
      "type": "sync|async|realtime|batch|unknown",
      "label": "Connection description",
      "properties": {
        "protocol": "REST|gRPC|WebSocket|AMQP|etc",
        "authenticated": true
      },
      "style": "solid|dashed|dotted",
      "confidence": 0.9,
      "assumed": false
    }
  ],
  "patterns_detected": ["microservices", "event-driven", "monolith"],
  "overall_confidence": 0.85,
  "ambiguities": ["List of unclear elements that need user confirmation"]
}

## Rules
- If a connection seems implied but not drawn, include it with "assumed": true
- Solid arrows = synchronous calls
- Dashed arrows = asynchronous/event-based
- Cylinders = databases
- Clouds = external services
- Boxes = services/applications
- If text is unclear, make best guess and note in ambiguities
- Return ONLY valid JSON, no markdown code blocks`

// DesignSuggestionsPrompt is the prompt template for generating design suggestions
const DesignSuggestionsPrompt = `You are a senior system architect reviewing a system design.

## Current Design
Nodes: %s
Edges: %s
Context: %s

## Your Task
Analyze this design and provide actionable suggestions for improvement.

## Categories to Consider
1. **Scalability** - Can this handle 10x, 100x load?
2. **Security** - Authentication, encryption, isolation
3. **Reliability** - Single points of failure, redundancy
4. **Performance** - Caching, connection pooling, async patterns
5. **Maintainability** - Service boundaries, coupling
6. **Cost** - Resource optimization

## Output Format
Return a JSON object (no markdown, just pure JSON):
{
  "suggestions": [
    {
      "category": "scalability|security|reliability|performance|maintainability|cost",
      "severity": "critical|warning|info",
      "title": "Short title",
      "description": "Detailed explanation",
      "affected_nodes": ["node_ids"],
      "recommendation": "Specific action to take",
      "impact_score": 8,
      "complexity_score": 5
    }
  ]
}

## Important Rules
- Be specific, not generic
- Reference actual components in the design
- Prioritize critical issues first
- Don't suggest unnecessary complexity
- Consider the apparent scale/context of the application
- Return ONLY valid JSON, no markdown code blocks`

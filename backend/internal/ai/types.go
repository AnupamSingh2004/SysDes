package ai

// ExtractedNode represents a system component extracted from a sketch
type ExtractedNode struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"` // service, database, queue, cache, gateway, client, external, container, load_balancer
	Label       string                 `json:"label"`
	Description string                 `json:"description,omitempty"`
	Position    Position               `json:"position"`
	Properties  map[string]interface{} `json:"properties,omitempty"`
	Confidence  float64                `json:"confidence"`
}

// Position represents x,y coordinates
type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// ExtractedEdge represents a connection between components
type ExtractedEdge struct {
	ID         string                 `json:"id"`
	Source     string                 `json:"source"`
	Target     string                 `json:"target"`
	Type       string                 `json:"type"` // sync, async, realtime, batch, unknown
	Label      string                 `json:"label,omitempty"`
	Properties map[string]interface{} `json:"properties,omitempty"`
	Style      string                 `json:"style"` // solid, dashed, dotted
	Confidence float64                `json:"confidence"`
	Assumed    bool                   `json:"assumed"`
}

// InterpretRequest is the request body for sketch interpretation
type InterpretRequest struct {
	Image       string `json:"image"`       // base64 encoded image
	Explanation string `json:"explanation"` // user's explanation of the sketch
}

// InterpretResponse is the response from sketch interpretation
type InterpretResponse struct {
	Nodes             []ExtractedNode `json:"nodes"`
	Edges             []ExtractedEdge `json:"edges"`
	PatternsDetected  []string        `json:"patterns_detected"`
	OverallConfidence float64         `json:"overall_confidence"`
	Ambiguities       []string        `json:"ambiguities,omitempty"`
}

// SuggestRequest is the request body for design suggestions
type SuggestRequest struct {
	Nodes       []ExtractedNode `json:"nodes"`
	Edges       []ExtractedEdge `json:"edges"`
	Context     string          `json:"context,omitempty"`
}

// Suggestion represents a design improvement suggestion
type Suggestion struct {
	Category        string   `json:"category"` // scalability, security, reliability, performance, maintainability, cost
	Severity        string   `json:"severity"` // critical, warning, info
	Title           string   `json:"title"`
	Description     string   `json:"description"`
	AffectedNodes   []string `json:"affected_nodes,omitempty"`
	Recommendation  string   `json:"recommendation"`
	ImpactScore     int      `json:"impact_score"`     // 1-10
	ComplexityScore int      `json:"complexity_score"` // 1-10
}

// SuggestResponse is the response from design suggestions
type SuggestResponse struct {
	Suggestions []Suggestion `json:"suggestions"`
}

// GeminiResponse represents the raw response from Gemini API
type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

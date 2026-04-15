package rules

// Node represents a system component from AI interpretation
type Node struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"` // service, database, queue, cache, gateway, client, external, load_balancer
	Label       string                 `json:"label"`
	Description string                 `json:"description,omitempty"`
	Position    Position               `json:"position"`
	Properties  map[string]interface{} `json:"properties,omitempty"`
}

// Position represents x,y coordinates
type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// Edge represents a connection between components
type Edge struct {
	ID         string                 `json:"id"`
	Source     string                 `json:"source"`
	Target     string                 `json:"target"`
	Type       string                 `json:"type"` // sync, async, realtime, batch
	Label      string                 `json:"label,omitempty"`
	Properties map[string]interface{} `json:"properties,omitempty"`
	Style      string                 `json:"style"` // solid, dashed, dotted
}

// Design represents a system design to analyze
type Design struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}

// Suggestion represents a design improvement suggestion
type Suggestion struct {
	ID              string   `json:"id"`
	RuleID          string   `json:"rule_id"`
	Category        string   `json:"category"` // scalability, security, reliability, performance, maintainability, cost
	Severity        string   `json:"severity"` // critical, warning, info
	Title           string   `json:"title"`
	Description     string   `json:"description"`
	Recommendation  string   `json:"recommendation"`
	AffectedNodes   []string `json:"affected_nodes,omitempty"`
	ImpactScore     int      `json:"impact_score"`     // 1-10
	ComplexityScore int      `json:"complexity_score"` // 1-10
}

// AnalyzeRequest is the request body for design analysis
type AnalyzeRequest struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}

// AnalyzeResponse is the response from design analysis
type AnalyzeResponse struct {
	Suggestions   []Suggestion `json:"suggestions"`
	TotalScore    int          `json:"total_score"`
	CriticalCount int          `json:"critical_count"`
	WarningCount  int          `json:"warning_count"`
	InfoCount     int          `json:"info_count"`
}

package rules

import "github.com/google/uuid"

// Rule defines a heuristic rule interface
type Rule interface {
	ID() string
	Name() string
	Category() string
	Severity() string
	Check(design *Design) bool
	GetAffectedNodes(design *Design) []string
	GetSuggestion() (title, description, recommendation string)
	ImpactScore() int
	ComplexityScore() int
}

// BaseRule provides common rule functionality
type BaseRule struct {
	id              string
	name            string
	category        string
	severity        string
	title           string
	description     string
	recommendation  string
	impactScore     int
	complexityScore int
}

func (r *BaseRule) ID() string           { return r.id }
func (r *BaseRule) Name() string         { return r.name }
func (r *BaseRule) Category() string     { return r.category }
func (r *BaseRule) Severity() string     { return r.severity }
func (r *BaseRule) ImpactScore() int     { return r.impactScore }
func (r *BaseRule) ComplexityScore() int { return r.complexityScore }
func (r *BaseRule) GetSuggestion() (string, string, string) {
	return r.title, r.description, r.recommendation
}

// ============================================================================
// RULE 1: Missing API Gateway
// ============================================================================

type MissingAPIGatewayRule struct {
	BaseRule
}

func NewMissingAPIGatewayRule() *MissingAPIGatewayRule {
	return &MissingAPIGatewayRule{
		BaseRule: BaseRule{
			id:              "missing-api-gateway",
			name:            "No API Gateway",
			category:        "security",
			severity:        "warning",
			title:           "Consider adding an API Gateway",
			description:     "With multiple services, an API Gateway provides centralized authentication, rate limiting, and routing.",
			recommendation:  "Add an API Gateway (Kong, AWS API Gateway, or Nginx) between clients and your services.",
			impactScore:     8,
			complexityScore: 5,
		},
	}
}

func (r *MissingAPIGatewayRule) Check(design *Design) bool {
	serviceCount := 0
	hasClient := false
	hasGateway := false

	for _, node := range design.Nodes {
		switch node.Type {
		case "service":
			serviceCount++
		case "client":
			hasClient = true
		case "gateway", "load_balancer":
			hasGateway = true
		}
	}

	return serviceCount > 2 && hasClient && !hasGateway
}

func (r *MissingAPIGatewayRule) GetAffectedNodes(design *Design) []string {
	var affected []string
	for _, node := range design.Nodes {
		if node.Type == "service" {
			affected = append(affected, node.ID)
		}
	}
	return affected
}

// ============================================================================
// RULE 2: Shared Database Anti-pattern
// ============================================================================

type SharedDatabaseRule struct {
	BaseRule
}

func NewSharedDatabaseRule() *SharedDatabaseRule {
	return &SharedDatabaseRule{
		BaseRule: BaseRule{
			id:              "shared-database",
			name:            "Shared Database Anti-pattern",
			category:        "maintainability",
			severity:        "critical",
			title:           "Multiple services sharing a database",
			description:     "Sharing databases between services creates tight coupling and makes independent deployment difficult.",
			recommendation:  "Consider database-per-service pattern or use APIs for cross-service data access.",
			impactScore:     9,
			complexityScore: 8,
		},
	}
}

func (r *SharedDatabaseRule) Check(design *Design) bool {
	// Find databases and check if multiple services connect to them
	for _, node := range design.Nodes {
		if node.Type == "database" {
			sourceCount := 0
			for _, edge := range design.Edges {
				if edge.Target == node.ID {
					sourceCount++
				}
			}
			if sourceCount > 1 {
				return true
			}
		}
	}
	return false
}

func (r *SharedDatabaseRule) GetAffectedNodes(design *Design) []string {
	var affected []string
	for _, node := range design.Nodes {
		if node.Type == "database" {
			sourceCount := 0
			for _, edge := range design.Edges {
				if edge.Target == node.ID {
					sourceCount++
				}
			}
			if sourceCount > 1 {
				affected = append(affected, node.ID)
			}
		}
	}
	return affected
}

// ============================================================================
// RULE 3: Missing Cache Layer
// ============================================================================

type MissingCacheRule struct {
	BaseRule
}

func NewMissingCacheRule() *MissingCacheRule {
	return &MissingCacheRule{
		BaseRule: BaseRule{
			id:              "no-cache",
			name:            "Missing Cache Layer",
			category:        "performance",
			severity:        "info",
			title:           "Consider adding a caching layer",
			description:     "Caching frequently accessed data can significantly improve response times and reduce database load.",
			recommendation:  "Add Redis or Memcached as a caching layer between your services and database.",
			impactScore:     6,
			complexityScore: 3,
		},
	}
}

func (r *MissingCacheRule) Check(design *Design) bool {
	hasDatabase := false
	hasCache := false

	for _, node := range design.Nodes {
		if node.Type == "database" {
			hasDatabase = true
		}
		if node.Type == "cache" {
			hasCache = true
		}
	}

	return hasDatabase && !hasCache && len(design.Nodes) > 3
}

func (r *MissingCacheRule) GetAffectedNodes(design *Design) []string {
	var affected []string
	for _, node := range design.Nodes {
		if node.Type == "database" {
			affected = append(affected, node.ID)
		}
	}
	return affected
}

// ============================================================================
// RULE 4: Single Point of Failure
// ============================================================================

type SinglePointOfFailureRule struct {
	BaseRule
}

func NewSinglePointOfFailureRule() *SinglePointOfFailureRule {
	return &SinglePointOfFailureRule{
		BaseRule: BaseRule{
			id:              "single-point-failure",
			name:            "Single Point of Failure",
			category:        "reliability",
			severity:        "critical",
			title:           "Single point of failure detected",
			description:     "Critical components without redundancy can cause system-wide outages.",
			recommendation:  "Consider adding replication, load balancing, or failover for critical components.",
			impactScore:     10,
			complexityScore: 6,
		},
	}
}

func (r *SinglePointOfFailureRule) Check(design *Design) bool {
	for _, node := range design.Nodes {
		if node.Type == "database" || node.Type == "gateway" {
			incomingCount := 0
			for _, edge := range design.Edges {
				if edge.Target == node.ID {
					incomingCount++
				}
			}
			// If critical node has many dependencies and no replication
			isReplicated := false
			if node.Properties != nil {
				if rep, ok := node.Properties["replicated"].(bool); ok && rep {
					isReplicated = true
				}
			}
			if incomingCount >= 2 && !isReplicated {
				return true
			}
		}
	}
	return false
}

func (r *SinglePointOfFailureRule) GetAffectedNodes(design *Design) []string {
	var affected []string
	for _, node := range design.Nodes {
		if node.Type == "database" || node.Type == "gateway" {
			incomingCount := 0
			for _, edge := range design.Edges {
				if edge.Target == node.ID {
					incomingCount++
				}
			}
			if incomingCount >= 2 {
				affected = append(affected, node.ID)
			}
		}
	}
	return affected
}

// ============================================================================
// RULE 5: Missing Message Queue for Async
// ============================================================================

type MissingQueueRule struct {
	BaseRule
}

func NewMissingQueueRule() *MissingQueueRule {
	return &MissingQueueRule{
		BaseRule: BaseRule{
			id:              "missing-queue",
			name:            "Missing Message Queue",
			category:        "scalability",
			severity:        "warning",
			title:           "Consider adding a message queue",
			description:     "For systems with multiple services, a message queue enables async communication and decouples services.",
			recommendation:  "Add RabbitMQ, Kafka, or AWS SQS for asynchronous inter-service communication.",
			impactScore:     7,
			complexityScore: 5,
		},
	}
}

func (r *MissingQueueRule) Check(design *Design) bool {
	serviceCount := 0
	hasQueue := false

	for _, node := range design.Nodes {
		if node.Type == "service" {
			serviceCount++
		}
		if node.Type == "queue" {
			hasQueue = true
		}
	}

	// Suggest queue if 3+ services and no queue
	return serviceCount >= 3 && !hasQueue
}

func (r *MissingQueueRule) GetAffectedNodes(design *Design) []string {
	var affected []string
	for _, node := range design.Nodes {
		if node.Type == "service" {
			affected = append(affected, node.ID)
		}
	}
	return affected
}

// ============================================================================
// RULE 6: No Authentication Layer
// ============================================================================

type NoAuthenticationRule struct {
	BaseRule
}

func NewNoAuthenticationRule() *NoAuthenticationRule {
	return &NoAuthenticationRule{
		BaseRule: BaseRule{
			id:              "no-auth",
			name:            "No Authentication Layer",
			category:        "security",
			severity:        "critical",
			title:           "No authentication layer detected",
			description:     "Public-facing services should have authentication and authorization mechanisms.",
			recommendation:  "Add an auth service or integrate authentication at the API Gateway level.",
			impactScore:     10,
			complexityScore: 7,
		},
	}
}

func (r *NoAuthenticationRule) Check(design *Design) bool {
	hasClient := false
	hasAuthNode := false

	for _, node := range design.Nodes {
		if node.Type == "client" {
			hasClient = true
		}
		// Check for auth-related nodes by label
		label := node.Label
		if contains(label, "auth") || contains(label, "identity") || contains(label, "oauth") || contains(label, "login") {
			hasAuthNode = true
		}
	}

	return hasClient && !hasAuthNode && len(design.Nodes) > 2
}

func (r *NoAuthenticationRule) GetAffectedNodes(design *Design) []string {
	var affected []string
	for _, node := range design.Nodes {
		if node.Type == "service" || node.Type == "gateway" {
			affected = append(affected, node.ID)
		}
	}
	return affected
}

// ============================================================================
// RULE 7: Direct External Dependency
// ============================================================================

type DirectExternalDependencyRule struct {
	BaseRule
}

func NewDirectExternalDependencyRule() *DirectExternalDependencyRule {
	return &DirectExternalDependencyRule{
		BaseRule: BaseRule{
			id:              "direct-external",
			name:            "Direct External Dependency",
			category:        "reliability",
			severity:        "warning",
			title:           "Direct external service dependency",
			description:     "Services directly calling external APIs without a wrapper can be vulnerable to external failures.",
			recommendation:  "Consider adding a facade service or circuit breaker pattern for external dependencies.",
			impactScore:     6,
			complexityScore: 4,
		},
	}
}

func (r *DirectExternalDependencyRule) Check(design *Design) bool {
	for _, edge := range design.Edges {
		targetNode := findNode(design, edge.Target)
		sourceNode := findNode(design, edge.Source)
		if targetNode != nil && sourceNode != nil {
			if targetNode.Type == "external" && sourceNode.Type == "service" {
				return true
			}
		}
	}
	return false
}

func (r *DirectExternalDependencyRule) GetAffectedNodes(design *Design) []string {
	var affected []string
	for _, edge := range design.Edges {
		targetNode := findNode(design, edge.Target)
		if targetNode != nil && targetNode.Type == "external" {
			affected = append(affected, edge.Source)
		}
	}
	return affected
}

// ============================================================================
// Helper Functions
// ============================================================================

func findNode(design *Design, id string) *Node {
	for i := range design.Nodes {
		if design.Nodes[i].ID == id {
			return &design.Nodes[i]
		}
	}
	return nil
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsLower(toLower(s), toLower(substr)))
}

func containsLower(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func toLower(s string) string {
	b := make([]byte, len(s))
	for i := range s {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c += 'a' - 'A'
		}
		b[i] = c
	}
	return string(b)
}

// ============================================================================
// RULE 8: Long Synchronous Chain
// ============================================================================

type LongSyncChainRule struct {
	BaseRule
}

func NewLongSyncChainRule() *LongSyncChainRule {
	return &LongSyncChainRule{
		BaseRule: BaseRule{
			id:              "sync-chain",
			name:            "Long Synchronous Chain",
			category:        "performance",
			severity:        "warning",
			title:           "Long synchronous call chain detected",
			description:     "Chains of synchronous calls increase latency and reduce reliability. Each hop adds latency and failure risk.",
			recommendation:  "Consider using async messaging or caching to break long chains. Use event-driven patterns where possible.",
			impactScore:     7,
			complexityScore: 6,
		},
	}
}

func (r *LongSyncChainRule) Check(design *Design) bool {
	// Count synchronous edges - if many sync edges relative to nodes, it's a warning
	syncCount := 0
	for _, edge := range design.Edges {
		if edge.Type == "sync" || edge.Type == "" {
			syncCount++
		}
	}
	// If more than 3 sync edges and they form potential chains
	return syncCount > 3 && len(design.Nodes) > 2
}

func (r *LongSyncChainRule) GetAffectedNodes(design *Design) []string {
	var affected []string
	for _, node := range design.Nodes {
		if node.Type == "service" {
			affected = append(affected, node.ID)
		}
	}
	return affected
}

// ============================================================================
// RULE 9: Missing Load Balancer
// ============================================================================

type MissingLoadBalancerRule struct {
	BaseRule
}

func NewMissingLoadBalancerRule() *MissingLoadBalancerRule {
	return &MissingLoadBalancerRule{
		BaseRule: BaseRule{
			id:              "missing-lb",
			name:            "Missing Load Balancer",
			category:        "scalability",
			severity:        "warning",
			title:           "No load balancer for high-traffic services",
			description:     "Services handling client traffic should have load balancing for better distribution and failover.",
			recommendation:  "Add a load balancer (NGINX, HAProxy, or cloud LB) in front of services that receive external traffic.",
			impactScore:     7,
			complexityScore: 4,
		},
	}
}

func (r *MissingLoadBalancerRule) Check(design *Design) bool {
	hasClient := false
	hasLoadBalancer := false
	serviceCount := 0

	for _, node := range design.Nodes {
		switch node.Type {
		case "client":
			hasClient = true
		case "load_balancer":
			hasLoadBalancer = true
		case "service":
			serviceCount++
		}
		// Also check labels for LB
		if contains(node.Label, "load balancer") || contains(node.Label, "nginx") || contains(node.Label, "haproxy") {
			hasLoadBalancer = true
		}
	}

	return hasClient && serviceCount >= 2 && !hasLoadBalancer
}

func (r *MissingLoadBalancerRule) GetAffectedNodes(design *Design) []string {
	var affected []string
	for _, node := range design.Nodes {
		if node.Type == "service" {
			affected = append(affected, node.ID)
		}
	}
	return affected
}

// ============================================================================
// RULE 10: Missing Observability
// ============================================================================

type MissingObservabilityRule struct {
	BaseRule
}

func NewMissingObservabilityRule() *MissingObservabilityRule {
	return &MissingObservabilityRule{
		BaseRule: BaseRule{
			id:              "no-observability",
			name:            "Missing Observability",
			category:        "reliability",
			severity:        "info",
			title:           "No monitoring or logging components detected",
			description:     "Production systems should have monitoring, logging, and tracing for debugging and alerting.",
			recommendation:  "Add Prometheus + Grafana for metrics, ELK stack or Loki for logs, and Jaeger for tracing.",
			impactScore:     5,
			complexityScore: 4,
		},
	}
}

func (r *MissingObservabilityRule) Check(design *Design) bool {
	hasObservability := false

	for _, node := range design.Nodes {
		label := toLower(node.Label)
		if contains(label, "monitor") || contains(label, "prometheus") ||
			contains(label, "grafana") || contains(label, "logging") ||
			contains(label, "elk") || contains(label, "datadog") ||
			contains(label, "jaeger") || contains(label, "trace") {
			hasObservability = true
			break
		}
	}

	// Only suggest if there are 4+ nodes and no observability
	return len(design.Nodes) >= 4 && !hasObservability
}

func (r *MissingObservabilityRule) GetAffectedNodes(design *Design) []string {
	// Affects the whole system
	var affected []string
	for _, node := range design.Nodes {
		if node.Type == "service" || node.Type == "gateway" {
			affected = append(affected, node.ID)
		}
	}
	return affected
}

// ============================================================================
// Rules Engine
// ============================================================================

// Engine runs all rules against a design
type Engine struct {
	rules []Rule
}

// NewEngine creates a new rules engine with all rules
func NewEngine() *Engine {
	return &Engine{
		rules: []Rule{
			NewMissingAPIGatewayRule(),
			NewSharedDatabaseRule(),
			NewMissingCacheRule(),
			NewSinglePointOfFailureRule(),
			NewMissingQueueRule(),
			NewNoAuthenticationRule(),
			NewDirectExternalDependencyRule(),
			NewLongSyncChainRule(),
			NewMissingLoadBalancerRule(),
			NewMissingObservabilityRule(),
		},
	}
}

// Analyze runs all rules and returns suggestions
func (e *Engine) Analyze(design *Design) *AnalyzeResponse {
	var suggestions []Suggestion
	criticalCount := 0
	warningCount := 0
	infoCount := 0

	for _, rule := range e.rules {
		if rule.Check(design) {
			title, desc, rec := rule.GetSuggestion()
			suggestion := Suggestion{
				ID:              uuid.New().String(),
				RuleID:          rule.ID(),
				Category:        rule.Category(),
				Severity:        rule.Severity(),
				Title:           title,
				Description:     desc,
				Recommendation:  rec,
				AffectedNodes:   rule.GetAffectedNodes(design),
				ImpactScore:     rule.ImpactScore(),
				ComplexityScore: rule.ComplexityScore(),
			}
			suggestions = append(suggestions, suggestion)

			switch rule.Severity() {
			case "critical":
				criticalCount++
			case "warning":
				warningCount++
			case "info":
				infoCount++
			}
		}
	}

	// Calculate total score (higher is worse)
	totalScore := criticalCount*10 + warningCount*5 + infoCount*1

	return &AnalyzeResponse{
		Suggestions:   suggestions,
		TotalScore:    totalScore,
		CriticalCount: criticalCount,
		WarningCount:  warningCount,
		InfoCount:     infoCount,
	}
}

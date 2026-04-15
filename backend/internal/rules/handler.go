package rules

import (
	"github.com/gofiber/fiber/v2"
)

// Handler handles rules-related HTTP requests
type Handler struct {
	engine *Engine
}

// NewHandler creates a new rules handler
func NewHandler() *Handler {
	return &Handler{
		engine: NewEngine(),
	}
}

// RegisterRoutes registers rules routes
func (h *Handler) RegisterRoutes(router fiber.Router, authMiddleware fiber.Handler) {
	rules := router.Group("/rules")
	rules.Use(authMiddleware)

	rules.Post("/analyze", h.AnalyzeDesign)
}

// AnalyzeDesign handles POST /api/v1/rules/analyze
// @Summary Analyze a design using heuristic rules
// @Description Runs heuristic rules against a design and returns suggestions
// @Tags Rules
// @Accept json
// @Produce json
// @Param body body AnalyzeRequest true "Design data"
// @Success 200 {object} AnalyzeResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/rules/analyze [post]
func (h *Handler) AnalyzeDesign(c *fiber.Ctx) error {
	var req AnalyzeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	if len(req.Nodes) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "At least one node is required",
		})
	}

	design := &Design{
		Nodes: req.Nodes,
		Edges: req.Edges,
	}

	result := h.engine.Analyze(design)

	return c.JSON(result)
}

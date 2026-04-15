package ai

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

// Handler handles AI-related HTTP requests
type Handler struct {
	service *Service
}

// NewHandler creates a new AI handler
func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

// RegisterRoutes registers AI routes
func (h *Handler) RegisterRoutes(router fiber.Router, authMiddleware fiber.Handler) {
	ai := router.Group("/ai")
	ai.Use(authMiddleware)

	// Rate limit AI endpoints: 10 requests per minute per IP
	ai.Use(limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			// Rate limit per user (from auth context) or IP
			userID := c.Locals("user_id")
			if userID != nil {
				return userID.(string)
			}
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":   true,
				"message": "Rate limit exceeded. Please wait before making more AI requests.",
			})
		},
	}))

	ai.Post("/interpret", h.InterpretSketch)
	ai.Post("/suggest", h.GetSuggestions)
}

// InterpretSketch handles POST /api/v1/ai/interpret
// @Summary Interpret a sketch using AI
// @Description Analyzes a hand-drawn sketch and extracts system components
// @Tags AI
// @Accept json
// @Produce json
// @Param body body InterpretRequest true "Sketch data"
// @Success 200 {object} InterpretResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/ai/interpret [post]
func (h *Handler) InterpretSketch(c *fiber.Ctx) error {
	var req InterpretRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	if req.Image == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Image is required",
		})
	}

	// Validate image size (max 10MB base64 ~= ~7.5MB actual image)
	const maxImageSize = 10 * 1024 * 1024 // 10MB
	if len(req.Image) > maxImageSize {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Image too large (max 10MB)",
		})
	}

	result, err := h.service.InterpretSketch(req.Image, req.Explanation)
	if err != nil {
		// Don't expose internal error details to client
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to interpret sketch. Please try again.",
		})
	}

	return c.JSON(result)
}

// GetSuggestions handles POST /api/v1/ai/suggest
// @Summary Get design suggestions
// @Description Analyzes a system design and returns improvement suggestions
// @Tags AI
// @Accept json
// @Produce json
// @Param body body SuggestRequest true "Design data"
// @Success 200 {object} SuggestResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/ai/suggest [post]
func (h *Handler) GetSuggestions(c *fiber.Ctx) error {
	var req SuggestRequest
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

	result, err := h.service.GetSuggestions(req.Nodes, req.Edges, req.Context)
	if err != nil {
		// Don't expose internal error details to client
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to get suggestions. Please try again.",
		})
	}

	return c.JSON(result)
}

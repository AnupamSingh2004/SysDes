package whiteboard

import (
	"errors"

	"github.com/AnupamSingh2004/SysDes/backend/internal/shared/logger"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// Handler handles HTTP requests for whiteboards
type Handler struct {
	service *Service
}

// NewHandler creates a new whiteboard handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers the whiteboard routes
func (h *Handler) RegisterRoutes(api fiber.Router, requireAuth fiber.Handler) {
	// Project-scoped whiteboard routes (protected)
	projects := api.Group("/projects/:projectId/whiteboards")
	projects.Use(requireAuth)
	projects.Get("/", h.ListByProject)
	projects.Get("/default", h.GetDefault)
	projects.Post("/", h.Create)
	projects.Put("/default/canvas", h.SaveCanvasByProject)

	// Direct whiteboard routes (protected)
	whiteboards := api.Group("/whiteboards")
	whiteboards.Use(requireAuth)
	whiteboards.Get("/:id", h.Get)
	whiteboards.Put("/:id", h.Update)
	whiteboards.Put("/:id/canvas", h.SaveCanvas)
	whiteboards.Delete("/:id", h.Delete)
}

// ListByProject handles GET /api/v1/projects/:projectId/whiteboards
// @Summary List whiteboards for a project
// @Tags whiteboards
// @Security BearerAuth
// @Param projectId path string true "Project ID"
// @Success 200 {object} WhiteboardListResponse
// @Router /projects/{projectId}/whiteboards [get]
func (h *Handler) ListByProject(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	projectID, err := uuid.Parse(c.Params("projectId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid project id",
		})
	}

	whiteboards, err := h.service.GetProjectWhiteboards(c.Context(), projectID, userID)
	if err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "project not found",
			})
		}
		if errors.Is(err, ErrUnauthorized) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "access denied",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to get whiteboards",
		})
	}

	return c.JSON(WhiteboardListResponse{
		Whiteboards: whiteboards,
		Total:       len(whiteboards),
	})
}

// GetDefault handles GET /api/v1/projects/:projectId/whiteboards/default
// @Summary Get default whiteboard for a project (creates one if none exists)
// @Tags whiteboards
// @Security BearerAuth
// @Param projectId path string true "Project ID"
// @Success 200 {object} WhiteboardResponse
// @Router /projects/{projectId}/whiteboards/default [get]
func (h *Handler) GetDefault(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	projectID, err := uuid.Parse(c.Params("projectId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid project id",
		})
	}

	whiteboard, err := h.service.GetDefaultWhiteboard(c.Context(), projectID, userID)
	if err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "project not found",
			})
		}
		if errors.Is(err, ErrUnauthorized) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "access denied",
			})
		}
		logger.Error().Err(err).Str("projectID", projectID.String()).Str("userID", userID.String()).Msg("Failed to get default whiteboard")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "failed to get default whiteboard",
			"details": err.Error(),
		})
	}

	return c.JSON(whiteboard)
}

// Get handles GET /api/v1/whiteboards/:id
// @Summary Get a whiteboard by ID
// @Tags whiteboards
// @Security BearerAuth
// @Param id path string true "Whiteboard ID"
// @Success 200 {object} WhiteboardResponse
// @Router /whiteboards/{id} [get]
func (h *Handler) Get(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	whiteboardID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid whiteboard id",
		})
	}

	whiteboard, err := h.service.GetWhiteboard(c.Context(), whiteboardID, userID)
	if err != nil {
		if errors.Is(err, ErrWhiteboardNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "whiteboard not found",
			})
		}
		if errors.Is(err, ErrUnauthorized) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "access denied",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to get whiteboard",
		})
	}

	return c.JSON(whiteboard)
}

// Create handles POST /api/v1/projects/:projectId/whiteboards
// @Summary Create a new whiteboard
// @Tags whiteboards
// @Security BearerAuth
// @Param projectId path string true "Project ID"
// @Param body body CreateWhiteboardRequest true "Whiteboard data"
// @Success 201 {object} WhiteboardResponse
// @Router /projects/{projectId}/whiteboards [post]
func (h *Handler) Create(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	projectID, err := uuid.Parse(c.Params("projectId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid project id",
		})
	}

	var req CreateWhiteboardRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	whiteboard, err := h.service.CreateWhiteboard(c.Context(), projectID, userID, &req)
	if err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "project not found",
			})
		}
		if errors.Is(err, ErrUnauthorized) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "access denied",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to create whiteboard",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(whiteboard)
}

// Update handles PUT /api/v1/whiteboards/:id
// @Summary Update a whiteboard
// @Tags whiteboards
// @Security BearerAuth
// @Param id path string true "Whiteboard ID"
// @Param body body UpdateWhiteboardRequest true "Whiteboard data"
// @Success 200 {object} WhiteboardResponse
// @Router /whiteboards/{id} [put]
func (h *Handler) Update(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	whiteboardID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid whiteboard id",
		})
	}

	var req UpdateWhiteboardRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	whiteboard, err := h.service.UpdateWhiteboard(c.Context(), whiteboardID, userID, &req)
	if err != nil {
		if errors.Is(err, ErrWhiteboardNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "whiteboard not found",
			})
		}
		if errors.Is(err, ErrUnauthorized) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "access denied",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to update whiteboard",
		})
	}

	return c.JSON(whiteboard)
}

// SaveCanvas handles PUT /api/v1/whiteboards/:id/canvas
// @Summary Save canvas data for a whiteboard
// @Tags whiteboards
// @Security BearerAuth
// @Param id path string true "Whiteboard ID"
// @Param body body SaveCanvasRequest true "Canvas data"
// @Success 200 {object} WhiteboardResponse
// @Router /whiteboards/{id}/canvas [put]
func (h *Handler) SaveCanvas(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	whiteboardID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid whiteboard id",
		})
	}

	var req SaveCanvasRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if len(req.Data) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "data is required",
		})
	}

	whiteboard, err := h.service.SaveCanvasData(c.Context(), whiteboardID, userID, req.Data)
	if err != nil {
		if errors.Is(err, ErrWhiteboardNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "whiteboard not found",
			})
		}
		if errors.Is(err, ErrUnauthorized) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "access denied",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to save canvas data",
		})
	}

	return c.JSON(whiteboard)
}

// SaveCanvasByProject handles PUT /api/v1/projects/:projectId/whiteboards/default/canvas
// @Summary Save canvas data for a project's default whiteboard
// @Tags whiteboards
// @Security BearerAuth
// @Param projectId path string true "Project ID"
// @Param body body SaveCanvasRequest true "Canvas data"
// @Success 200 {object} WhiteboardResponse
// @Router /projects/{projectId}/whiteboards/default/canvas [put]
func (h *Handler) SaveCanvasByProject(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	projectID, err := uuid.Parse(c.Params("projectId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid project id",
		})
	}

	var req SaveCanvasRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if len(req.Data) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "data is required",
		})
	}

	whiteboard, err := h.service.SaveCanvasDataByProject(c.Context(), projectID, userID, req.Data)
	if err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "project not found",
			})
		}
		if errors.Is(err, ErrUnauthorized) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "access denied",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to save canvas data",
		})
	}

	return c.JSON(whiteboard)
}

// Delete handles DELETE /api/v1/whiteboards/:id
// @Summary Delete a whiteboard
// @Tags whiteboards
// @Security BearerAuth
// @Param id path string true "Whiteboard ID"
// @Success 204
// @Router /whiteboards/{id} [delete]
func (h *Handler) Delete(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	whiteboardID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid whiteboard id",
		})
	}

	err = h.service.DeleteWhiteboard(c.Context(), whiteboardID, userID)
	if err != nil {
		if errors.Is(err, ErrWhiteboardNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "whiteboard not found",
			})
		}
		if errors.Is(err, ErrUnauthorized) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "access denied",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to delete whiteboard",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// getUserID extracts the user ID from the context (set by auth middleware)
func getUserID(c *fiber.Ctx) (uuid.UUID, error) {
	userIDStr, ok := c.Locals("userID").(string)
	if !ok {
		return uuid.Nil, errors.New("user ID not found in context")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return uuid.Nil, errors.New("invalid user ID format")
	}

	return userID, nil
}

package project

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// Handler handles HTTP requests for projects
type Handler struct {
	service *Service
}

// NewHandler creates a new project handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers the project routes
func (h *Handler) RegisterRoutes(api fiber.Router, requireAuth fiber.Handler) {
	projects := api.Group("/projects")

	// Protected routes
	projects.Use(requireAuth)
	projects.Get("/", h.List)
	projects.Post("/", h.Create)
	projects.Get("/:id", h.Get)
	projects.Put("/:id", h.Update)
	projects.Delete("/:id", h.Delete)

	// Public route for shared projects (no auth required)
	api.Get("/public/projects/:slug", h.GetPublic)
}

// List handles GET /api/v1/projects
// @Summary List user's projects
// @Tags projects
// @Security BearerAuth
// @Success 200 {object} ProjectListResponse
// @Router /projects [get]
func (h *Handler) List(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	projects, err := h.service.GetUserProjects(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to get projects",
		})
	}

	return c.JSON(ProjectsListResponse{
		Projects: projects,
		Total:    len(projects),
	})
}

// Get handles GET /api/v1/projects/:id
// @Summary Get a project by ID
// @Tags projects
// @Security BearerAuth
// @Param id path string true "Project ID"
// @Success 200 {object} ProjectResponse
// @Router /projects/{id} [get]
func (h *Handler) Get(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	projectID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid project id",
		})
	}

	project, err := h.service.GetProject(c.Context(), projectID, userID)
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
			"error": "failed to get project",
		})
	}

	return c.JSON(project)
}

// GetPublic handles GET /api/v1/public/projects/:slug
// @Summary Get a public project by slug
// @Tags projects
// @Param slug path string true "Project slug"
// @Success 200 {object} ProjectResponse
// @Router /public/projects/{slug} [get]
func (h *Handler) GetPublic(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid slug",
		})
	}

	project, err := h.service.GetPublicProject(c.Context(), slug)
	if err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "project not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to get project",
		})
	}

	return c.JSON(project)
}

// Create handles POST /api/v1/projects
// @Summary Create a new project
// @Tags projects
// @Security BearerAuth
// @Param body body CreateProjectRequest true "Project data"
// @Success 201 {object} ProjectResponse
// @Router /projects [post]
func (h *Handler) Create(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	var req CreateProjectRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	// Validate
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "name is required",
		})
	}

	project, err := h.service.CreateProject(c.Context(), userID, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to create project",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(project)
}

// Update handles PUT /api/v1/projects/:id
// @Summary Update a project
// @Tags projects
// @Security BearerAuth
// @Param id path string true "Project ID"
// @Param body body UpdateProjectRequest true "Project data"
// @Success 200 {object} ProjectResponse
// @Router /projects/{id} [put]
func (h *Handler) Update(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	projectID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid project id",
		})
	}

	var req UpdateProjectRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	project, err := h.service.UpdateProject(c.Context(), projectID, userID, &req)
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
			"error": "failed to update project",
		})
	}

	return c.JSON(project)
}

// Delete handles DELETE /api/v1/projects/:id
// @Summary Delete a project
// @Tags projects
// @Security BearerAuth
// @Param id path string true "Project ID"
// @Success 204
// @Router /projects/{id} [delete]
func (h *Handler) Delete(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	projectID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid project id",
		})
	}

	err = h.service.DeleteProject(c.Context(), projectID, userID)
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
			"error": "failed to delete project",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// getUserID extracts the user ID from the Fiber context (set by auth middleware)
func getUserID(c *fiber.Ctx) (uuid.UUID, error) {
	userIDStr, ok := c.Locals("userID").(string)
	if !ok {
		return uuid.Nil, errors.New("user id not found in context")
	}
	return uuid.Parse(userIDStr)
}

package project

import (
	"time"

	"github.com/google/uuid"
)

// Project represents a system design project
type Project struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	IsPublic    bool       `json:"is_public"`
	PublicSlug  *string    `json:"public_slug,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// ProjectResponse is the public project data returned to clients
type ProjectResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	IsPublic    bool      `json:"is_public"`
	PublicSlug  *string   `json:"public_slug,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ToResponse converts Project to ProjectResponse
func (p *Project) ToResponse() *ProjectResponse {
	return &ProjectResponse{
		ID:          p.ID.String(),
		Name:        p.Name,
		Description: p.Description,
		IsPublic:    p.IsPublic,
		PublicSlug:  p.PublicSlug,
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
	}
}

// CreateProjectRequest is the request body for creating a project
type CreateProjectRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=255"`
	Description string `json:"description" validate:"max=1000"`
}

// UpdateProjectRequest is the request body for updating a project
type UpdateProjectRequest struct {
	Name        *string `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=1000"`
	IsPublic    *bool   `json:"is_public,omitempty"`
}

// ProjectsListResponse is the response for listing projects
type ProjectsListResponse struct {
	Projects []*ProjectResponse `json:"projects"`
	Total    int                `json:"total"`
}

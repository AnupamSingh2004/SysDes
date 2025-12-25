package project

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
)

// Common errors
var (
	ErrProjectNotFound = errors.New("project not found")
	ErrUnauthorized    = errors.New("unauthorized to access this project")
)

// Service handles business logic for projects
type Service struct {
	repo *Repository
}

// NewService creates a new project service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// GetUserProjects gets all projects for a user
func (s *Service) GetUserProjects(ctx context.Context, userID uuid.UUID) ([]*ProjectResponse, error) {
	projects, err := s.repo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user projects: %w", err)
	}

	responses := make([]*ProjectResponse, len(projects))
	for i, p := range projects {
		responses[i] = s.toResponse(p)
	}

	return responses, nil
}

// GetProject gets a project by ID, checking ownership
func (s *Service) GetProject(ctx context.Context, projectID, userID uuid.UUID) (*ProjectResponse, error) {
	project, err := s.repo.FindByID(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	// Check access - either owner or public project
	if project.UserID != userID && !project.IsPublic {
		return nil, ErrUnauthorized
	}

	return s.toResponse(project), nil
}

// GetPublicProject gets a public project by slug
func (s *Service) GetPublicProject(ctx context.Context, slug string) (*ProjectResponse, error) {
	project, err := s.repo.FindBySlug(ctx, slug)
	if err != nil {
		return nil, fmt.Errorf("failed to get public project: %w", err)
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	return s.toResponse(project), nil
}

// CreateProject creates a new project
func (s *Service) CreateProject(ctx context.Context, userID uuid.UUID, req *CreateProjectRequest) (*ProjectResponse, error) {
	project, err := s.repo.Create(ctx, userID, req.Name, req.Description)
	if err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}

	return s.toResponse(project), nil
}

// UpdateProject updates a project
func (s *Service) UpdateProject(ctx context.Context, projectID, userID uuid.UUID, req *UpdateProjectRequest) (*ProjectResponse, error) {
	// First check ownership
	existing, err := s.repo.FindByID(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to find project: %w", err)
	}
	if existing == nil {
		return nil, ErrProjectNotFound
	}
	if existing.UserID != userID {
		return nil, ErrUnauthorized
	}

	// Handle public slug generation when making public
	if req.IsPublic != nil && *req.IsPublic && !existing.IsPublic {
		// Generate a unique slug when making project public
		slug, err := s.repo.GenerateUniqueSlug(ctx, existing.Name)
		if err != nil {
			return nil, fmt.Errorf("failed to generate slug: %w", err)
		}
		err = s.repo.UpdateSlug(ctx, projectID, &slug)
		if err != nil {
			return nil, fmt.Errorf("failed to update slug: %w", err)
		}
	} else if req.IsPublic != nil && !*req.IsPublic && existing.IsPublic {
		// Remove slug when making project private
		err = s.repo.UpdateSlug(ctx, projectID, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to remove slug: %w", err)
		}
	}

	// Update the project
	project, err := s.repo.Update(ctx, projectID, req.Name, req.Description, req.IsPublic)
	if err != nil {
		return nil, fmt.Errorf("failed to update project: %w", err)
	}

	return s.toResponse(project), nil
}

// DeleteProject deletes a project
func (s *Service) DeleteProject(ctx context.Context, projectID, userID uuid.UUID) error {
	// First check ownership
	existing, err := s.repo.FindByID(ctx, projectID)
	if err != nil {
		return fmt.Errorf("failed to find project: %w", err)
	}
	if existing == nil {
		return ErrProjectNotFound
	}
	if existing.UserID != userID {
		return ErrUnauthorized
	}

	return s.repo.Delete(ctx, projectID)
}

// toResponse converts a Project to a ProjectResponse
func (s *Service) toResponse(p *Project) *ProjectResponse {
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

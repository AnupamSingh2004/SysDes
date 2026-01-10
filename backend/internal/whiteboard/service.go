package whiteboard

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
)

// Common errors
var (
	ErrWhiteboardNotFound = errors.New("whiteboard not found")
	ErrProjectNotFound    = errors.New("project not found")
	ErrUnauthorized       = errors.New("unauthorized to access this whiteboard")
)

// Service handles business logic for whiteboards
type Service struct {
	repo *Repository
}

// NewService creates a new whiteboard service
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// GetProjectWhiteboards gets all whiteboards for a project
func (s *Service) GetProjectWhiteboards(ctx context.Context, projectID, userID uuid.UUID) ([]*WhiteboardResponse, error) {
	// Check authorization
	if err := s.checkProjectAccess(ctx, projectID, userID); err != nil {
		return nil, err
	}

	whiteboards, err := s.repo.FindByProjectID(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get project whiteboards: %w", err)
	}

	responses := make([]*WhiteboardResponse, len(whiteboards))
	for i, w := range whiteboards {
		responses[i] = w.ToResponse()
	}

	return responses, nil
}

// GetWhiteboard gets a whiteboard by ID
func (s *Service) GetWhiteboard(ctx context.Context, whiteboardID, userID uuid.UUID) (*WhiteboardResponse, error) {
	whiteboard, err := s.repo.FindByID(ctx, whiteboardID)
	if err != nil {
		return nil, fmt.Errorf("failed to get whiteboard: %w", err)
	}
	if whiteboard == nil {
		return nil, ErrWhiteboardNotFound
	}

	// Check authorization
	if err := s.checkProjectAccess(ctx, whiteboard.ProjectID, userID); err != nil {
		return nil, err
	}

	return whiteboard.ToResponse(), nil
}

// GetDefaultWhiteboard gets or creates the default whiteboard for a project
func (s *Service) GetDefaultWhiteboard(ctx context.Context, projectID, userID uuid.UUID) (*WhiteboardResponse, error) {
	// Check authorization
	if err := s.checkProjectAccess(ctx, projectID, userID); err != nil {
		return nil, err
	}

	whiteboard, err := s.repo.FindDefaultByProjectID(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get default whiteboard: %w", err)
	}

	return whiteboard.ToResponse(), nil
}

// CreateWhiteboard creates a new whiteboard
func (s *Service) CreateWhiteboard(ctx context.Context, projectID, userID uuid.UUID, req *CreateWhiteboardRequest) (*WhiteboardResponse, error) {
	// Check authorization - only owner can create
	if err := s.checkOwnership(ctx, projectID, userID); err != nil {
		return nil, err
	}

	name := req.Name
	if name == "" {
		name = "Untitled"
	}

	whiteboard, err := s.repo.Create(ctx, projectID, name, req.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to create whiteboard: %w", err)
	}

	return whiteboard.ToResponse(), nil
}

// UpdateWhiteboard updates a whiteboard
func (s *Service) UpdateWhiteboard(ctx context.Context, whiteboardID, userID uuid.UUID, req *UpdateWhiteboardRequest) (*WhiteboardResponse, error) {
	// First get the whiteboard to check ownership
	existing, err := s.repo.FindByID(ctx, whiteboardID)
	if err != nil {
		return nil, fmt.Errorf("failed to find whiteboard: %w", err)
	}
	if existing == nil {
		return nil, ErrWhiteboardNotFound
	}

	// Check authorization - only owner can update
	if err := s.checkOwnership(ctx, existing.ProjectID, userID); err != nil {
		return nil, err
	}

	whiteboard, err := s.repo.Update(ctx, whiteboardID, req.Name, req.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to update whiteboard: %w", err)
	}

	return whiteboard.ToResponse(), nil
}

// SaveCanvasData saves the canvas data for a whiteboard
func (s *Service) SaveCanvasData(ctx context.Context, whiteboardID, userID uuid.UUID, data json.RawMessage) (*WhiteboardResponse, error) {
	// First get the whiteboard to check ownership
	existing, err := s.repo.FindByID(ctx, whiteboardID)
	if err != nil {
		return nil, fmt.Errorf("failed to find whiteboard: %w", err)
	}
	if existing == nil {
		return nil, ErrWhiteboardNotFound
	}

	// Check authorization - only owner can update
	if err := s.checkOwnership(ctx, existing.ProjectID, userID); err != nil {
		return nil, err
	}

	whiteboard, err := s.repo.UpdateData(ctx, whiteboardID, data)
	if err != nil {
		return nil, fmt.Errorf("failed to save canvas data: %w", err)
	}

	return whiteboard.ToResponse(), nil
}

// SaveCanvasDataByProject saves canvas data using project ID (creates default whiteboard if needed)
func (s *Service) SaveCanvasDataByProject(ctx context.Context, projectID, userID uuid.UUID, data json.RawMessage) (*WhiteboardResponse, error) {
	// Check authorization - only owner can update
	if err := s.checkOwnership(ctx, projectID, userID); err != nil {
		return nil, err
	}

	// Get or create default whiteboard
	whiteboard, err := s.repo.FindDefaultByProjectID(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get default whiteboard: %w", err)
	}

	// Update the data
	updated, err := s.repo.UpdateData(ctx, whiteboard.ID, data)
	if err != nil {
		return nil, fmt.Errorf("failed to save canvas data: %w", err)
	}

	return updated.ToResponse(), nil
}

// DeleteWhiteboard deletes a whiteboard
func (s *Service) DeleteWhiteboard(ctx context.Context, whiteboardID, userID uuid.UUID) error {
	// First get the whiteboard to check ownership
	existing, err := s.repo.FindByID(ctx, whiteboardID)
	if err != nil {
		return fmt.Errorf("failed to find whiteboard: %w", err)
	}
	if existing == nil {
		return ErrWhiteboardNotFound
	}

	// Check authorization - only owner can delete
	if err := s.checkOwnership(ctx, existing.ProjectID, userID); err != nil {
		return err
	}

	return s.repo.Delete(ctx, whiteboardID)
}

// checkProjectAccess checks if a user has access to a project (owner or public)
func (s *Service) checkProjectAccess(ctx context.Context, projectID, userID uuid.UUID) error {
	ownerID, err := s.repo.GetProjectOwner(ctx, projectID)
	if err != nil {
		return ErrProjectNotFound
	}

	// Owner always has access
	if ownerID == userID {
		return nil
	}

	// Check if project is public
	isPublic, err := s.repo.IsProjectPublic(ctx, projectID)
	if err != nil {
		return ErrProjectNotFound
	}

	if isPublic {
		return nil
	}

	return ErrUnauthorized
}

// checkOwnership checks if a user owns a project
func (s *Service) checkOwnership(ctx context.Context, projectID, userID uuid.UUID) error {
	ownerID, err := s.repo.GetProjectOwner(ctx, projectID)
	if err != nil {
		return ErrProjectNotFound
	}

	if ownerID != userID {
		return ErrUnauthorized
	}

	return nil
}

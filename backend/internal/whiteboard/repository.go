package whiteboard

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository handles database operations for whiteboards
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new whiteboard repository
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// FindByID finds a whiteboard by its ID
func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*Whiteboard, error) {
	query := `
		SELECT id, project_id, name, data, created_at, updated_at
		FROM whiteboards
		WHERE id = $1
	`

	var whiteboard Whiteboard
	err := r.db.QueryRow(ctx, query, id).Scan(
		&whiteboard.ID,
		&whiteboard.ProjectID,
		&whiteboard.Name,
		&whiteboard.Data,
		&whiteboard.CreatedAt,
		&whiteboard.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find whiteboard by id: %w", err)
	}

	return &whiteboard, nil
}

// FindByProjectID finds all whiteboards for a project
func (r *Repository) FindByProjectID(ctx context.Context, projectID uuid.UUID) ([]*Whiteboard, error) {
	query := `
		SELECT id, project_id, name, data, created_at, updated_at
		FROM whiteboards
		WHERE project_id = $1
		ORDER BY updated_at DESC
	`

	rows, err := r.db.Query(ctx, query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to find whiteboards by project id: %w", err)
	}
	defer rows.Close()

	var whiteboards []*Whiteboard
	for rows.Next() {
		var whiteboard Whiteboard
		err := rows.Scan(
			&whiteboard.ID,
			&whiteboard.ProjectID,
			&whiteboard.Name,
			&whiteboard.Data,
			&whiteboard.CreatedAt,
			&whiteboard.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan whiteboard: %w", err)
		}
		whiteboards = append(whiteboards, &whiteboard)
	}

	return whiteboards, nil
}

// FindDefaultByProjectID finds or creates the default whiteboard for a project
func (r *Repository) FindDefaultByProjectID(ctx context.Context, projectID uuid.UUID) (*Whiteboard, error) {
	// First, try to find an existing whiteboard
	query := `
		SELECT id, project_id, name, data, created_at, updated_at
		FROM whiteboards
		WHERE project_id = $1
		ORDER BY created_at ASC
		LIMIT 1
	`

	var whiteboard Whiteboard
	err := r.db.QueryRow(ctx, query, projectID).Scan(
		&whiteboard.ID,
		&whiteboard.ProjectID,
		&whiteboard.Name,
		&whiteboard.Data,
		&whiteboard.CreatedAt,
		&whiteboard.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		// Create a default whiteboard if none exists
		return r.Create(ctx, projectID, "Main Canvas", json.RawMessage(`{}`))
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find default whiteboard: %w", err)
	}

	return &whiteboard, nil
}

// Create creates a new whiteboard
func (r *Repository) Create(ctx context.Context, projectID uuid.UUID, name string, data json.RawMessage) (*Whiteboard, error) {
	if data == nil || len(data) == 0 {
		data = json.RawMessage(`{}`)
	}

	query := `
		INSERT INTO whiteboards (project_id, name, data)
		VALUES ($1, $2, $3)
		RETURNING id, project_id, name, data, created_at, updated_at
	`

	var whiteboard Whiteboard
	err := r.db.QueryRow(ctx, query, projectID, name, data).Scan(
		&whiteboard.ID,
		&whiteboard.ProjectID,
		&whiteboard.Name,
		&whiteboard.Data,
		&whiteboard.CreatedAt,
		&whiteboard.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create whiteboard: %w", err)
	}

	return &whiteboard, nil
}

// Update updates a whiteboard
func (r *Repository) Update(ctx context.Context, id uuid.UUID, name *string, data *json.RawMessage) (*Whiteboard, error) {
	query := `
		UPDATE whiteboards
		SET 
			name = COALESCE($2, name),
			data = COALESCE($3, data),
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, project_id, name, data, created_at, updated_at
	`

	var whiteboard Whiteboard
	err := r.db.QueryRow(ctx, query, id, name, data).Scan(
		&whiteboard.ID,
		&whiteboard.ProjectID,
		&whiteboard.Name,
		&whiteboard.Data,
		&whiteboard.CreatedAt,
		&whiteboard.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update whiteboard: %w", err)
	}

	return &whiteboard, nil
}

// UpdateData updates only the canvas data of a whiteboard
func (r *Repository) UpdateData(ctx context.Context, id uuid.UUID, data json.RawMessage) (*Whiteboard, error) {
	query := `
		UPDATE whiteboards
		SET 
			data = $2,
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, project_id, name, data, created_at, updated_at
	`

	var whiteboard Whiteboard
	err := r.db.QueryRow(ctx, query, id, data).Scan(
		&whiteboard.ID,
		&whiteboard.ProjectID,
		&whiteboard.Name,
		&whiteboard.Data,
		&whiteboard.CreatedAt,
		&whiteboard.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update whiteboard data: %w", err)
	}

	return &whiteboard, nil
}

// Delete deletes a whiteboard
func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM whiteboards WHERE id = $1`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete whiteboard: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("whiteboard not found")
	}

	return nil
}

// GetProjectOwner gets the owner of a project (for authorization)
func (r *Repository) GetProjectOwner(ctx context.Context, projectID uuid.UUID) (uuid.UUID, error) {
	query := `SELECT user_id FROM projects WHERE id = $1`

	var ownerID uuid.UUID
	err := r.db.QueryRow(ctx, query, projectID).Scan(&ownerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, fmt.Errorf("project not found")
	}
	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to get project owner: %w", err)
	}

	return ownerID, nil
}

// IsProjectPublic checks if a project is public
func (r *Repository) IsProjectPublic(ctx context.Context, projectID uuid.UUID) (bool, error) {
	query := `SELECT is_public FROM projects WHERE id = $1`

	var isPublic bool
	err := r.db.QueryRow(ctx, query, projectID).Scan(&isPublic)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, fmt.Errorf("project not found")
	}
	if err != nil {
		return false, fmt.Errorf("failed to check if project is public: %w", err)
	}

	return isPublic, nil
}

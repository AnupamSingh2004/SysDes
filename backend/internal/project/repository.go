package project

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository handles database operations for projects
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new project repository
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// FindByID finds a project by its ID
func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*Project, error) {
	query := `
		SELECT id, user_id, name, description, is_public, public_slug, created_at, updated_at
		FROM projects
		WHERE id = $1
	`

	var project Project
	err := r.db.QueryRow(ctx, query, id).Scan(
		&project.ID,
		&project.UserID,
		&project.Name,
		&project.Description,
		&project.IsPublic,
		&project.PublicSlug,
		&project.CreatedAt,
		&project.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find project by id: %w", err)
	}

	return &project, nil
}

// FindByUserID finds all projects for a user
func (r *Repository) FindByUserID(ctx context.Context, userID uuid.UUID) ([]*Project, error) {
	query := `
		SELECT id, user_id, name, description, is_public, public_slug, created_at, updated_at
		FROM projects
		WHERE user_id = $1
		ORDER BY updated_at DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to find projects by user id: %w", err)
	}
	defer rows.Close()

	var projects []*Project
	for rows.Next() {
		var project Project
		err := rows.Scan(
			&project.ID,
			&project.UserID,
			&project.Name,
			&project.Description,
			&project.IsPublic,
			&project.PublicSlug,
			&project.CreatedAt,
			&project.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan project: %w", err)
		}
		projects = append(projects, &project)
	}

	return projects, nil
}

// FindBySlug finds a public project by its slug
func (r *Repository) FindBySlug(ctx context.Context, slug string) (*Project, error) {
	query := `
		SELECT id, user_id, name, description, is_public, public_slug, created_at, updated_at
		FROM projects
		WHERE public_slug = $1 AND is_public = true
	`

	var project Project
	err := r.db.QueryRow(ctx, query, slug).Scan(
		&project.ID,
		&project.UserID,
		&project.Name,
		&project.Description,
		&project.IsPublic,
		&project.PublicSlug,
		&project.CreatedAt,
		&project.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find project by slug: %w", err)
	}

	return &project, nil
}

// Create creates a new project
func (r *Repository) Create(ctx context.Context, userID uuid.UUID, name, description string) (*Project, error) {
	query := `
		INSERT INTO projects (user_id, name, description)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, name, description, is_public, public_slug, created_at, updated_at
	`

	var project Project
	err := r.db.QueryRow(ctx, query, userID, name, description).Scan(
		&project.ID,
		&project.UserID,
		&project.Name,
		&project.Description,
		&project.IsPublic,
		&project.PublicSlug,
		&project.CreatedAt,
		&project.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}

	return &project, nil
}

// Update updates a project
func (r *Repository) Update(ctx context.Context, id uuid.UUID, name, description *string, isPublic *bool) (*Project, error) {
	// Build dynamic update query
	query := `
		UPDATE projects
		SET 
			name = COALESCE($2, name),
			description = COALESCE($3, description),
			is_public = COALESCE($4, is_public),
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, user_id, name, description, is_public, public_slug, created_at, updated_at
	`

	var project Project
	err := r.db.QueryRow(ctx, query, id, name, description, isPublic).Scan(
		&project.ID,
		&project.UserID,
		&project.Name,
		&project.Description,
		&project.IsPublic,
		&project.PublicSlug,
		&project.CreatedAt,
		&project.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update project: %w", err)
	}

	return &project, nil
}

// Delete deletes a project
func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM projects WHERE id = $1`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete project: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("project not found")
	}

	return nil
}

// GenerateUniqueSlug generates a unique public slug for a project
func (r *Repository) GenerateUniqueSlug(ctx context.Context, baseName string) (string, error) {
	// Create a slug from the base name
	slug := generateSlug(baseName)

	// Check if it exists
	exists, err := r.slugExists(ctx, slug)
	if err != nil {
		return "", err
	}

	if !exists {
		return slug, nil
	}

	// Add random suffix if exists
	for i := 0; i < 10; i++ {
		newSlug := fmt.Sprintf("%s-%s", slug, uuid.New().String()[:8])
		exists, err := r.slugExists(ctx, newSlug)
		if err != nil {
			return "", err
		}
		if !exists {
			return newSlug, nil
		}
	}

	return "", fmt.Errorf("failed to generate unique slug")
}

func (r *Repository) slugExists(ctx context.Context, slug string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM projects WHERE public_slug = $1)`
	var exists bool
	err := r.db.QueryRow(ctx, query, slug).Scan(&exists)
	return exists, err
}

// UpdateSlug updates the public slug of a project
func (r *Repository) UpdateSlug(ctx context.Context, id uuid.UUID, slug *string) error {
	query := `UPDATE projects SET public_slug = $2, updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id, slug)
	return err
}

// Helper function to generate a URL-friendly slug
func generateSlug(name string) string {
	// Simple slug generation - lowercase, replace spaces with dashes
	slug := ""
	for _, c := range name {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' {
			slug += string(c)
		} else if c >= 'A' && c <= 'Z' {
			slug += string(c + 32) // lowercase
		} else if c == ' ' {
			slug += "-"
		}
	}
	return slug
}

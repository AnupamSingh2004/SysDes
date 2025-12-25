package auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository handles database operations for auth
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new auth repository
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// FindByID finds a user by their ID
func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*User, error) {
	query := `
		SELECT id, email, name, avatar_url, github_id, google_id, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var user User
	err := r.db.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.AvatarURL,
		&user.GitHubID,
		&user.GoogleID,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user by id: %w", err)
	}

	return &user, nil
}

// FindByEmail finds a user by their email
func (r *Repository) FindByEmail(ctx context.Context, email string) (*User, error) {
	query := `
		SELECT id, email, name, avatar_url, github_id, google_id, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var user User
	err := r.db.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.AvatarURL,
		&user.GitHubID,
		&user.GoogleID,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user by email: %w", err)
	}

	return &user, nil
}

// FindByGitHubID finds a user by their GitHub ID
func (r *Repository) FindByGitHubID(ctx context.Context, githubID string) (*User, error) {
	query := `
		SELECT id, email, name, avatar_url, github_id, google_id, created_at, updated_at
		FROM users
		WHERE github_id = $1
	`

	var user User
	err := r.db.QueryRow(ctx, query, githubID).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.AvatarURL,
		&user.GitHubID,
		&user.GoogleID,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user by github id: %w", err)
	}

	return &user, nil
}

// FindByGoogleID finds a user by their Google ID
func (r *Repository) FindByGoogleID(ctx context.Context, googleID string) (*User, error) {
	query := `
		SELECT id, email, name, avatar_url, github_id, google_id, created_at, updated_at
		FROM users
		WHERE google_id = $1
	`

	var user User
	err := r.db.QueryRow(ctx, query, googleID).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.AvatarURL,
		&user.GitHubID,
		&user.GoogleID,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find user by google id: %w", err)
	}

	return &user, nil
}

// Create creates a new user
func (r *Repository) Create(ctx context.Context, email, name, avatarURL string, githubID, googleID *string) (*User, error) {
	query := `
		INSERT INTO users (email, name, avatar_url, github_id, google_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, email, name, avatar_url, github_id, google_id, created_at, updated_at
	`

	var user User
	err := r.db.QueryRow(ctx, query, email, name, avatarURL, githubID, googleID).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.AvatarURL,
		&user.GitHubID,
		&user.GoogleID,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &user, nil
}

// UpdateGitHubID updates a user's GitHub ID
func (r *Repository) UpdateGitHubID(ctx context.Context, userID uuid.UUID, githubID string) error {
	query := `
		UPDATE users
		SET github_id = $1, updated_at = NOW()
		WHERE id = $2
	`

	_, err := r.db.Exec(ctx, query, githubID, userID)
	if err != nil {
		return fmt.Errorf("failed to update github id: %w", err)
	}

	return nil
}

// UpdateGoogleID updates a user's Google ID
func (r *Repository) UpdateGoogleID(ctx context.Context, userID uuid.UUID, googleID string) error {
	query := `
		UPDATE users
		SET google_id = $1, updated_at = NOW()
		WHERE id = $2
	`

	_, err := r.db.Exec(ctx, query, googleID, userID)
	if err != nil {
		return fmt.Errorf("failed to update google id: %w", err)
	}

	return nil
}

// UpdateProfile updates a user's profile information
func (r *Repository) UpdateProfile(ctx context.Context, userID uuid.UUID, name, avatarURL string) error {
	query := `
		UPDATE users
		SET name = $1, avatar_url = $2, updated_at = NOW()
		WHERE id = $3
	`

	_, err := r.db.Exec(ctx, query, name, avatarURL, userID)
	if err != nil {
		return fmt.Errorf("failed to update profile: %w", err)
	}

	return nil
}

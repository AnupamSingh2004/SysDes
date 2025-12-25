package auth

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system
type User struct {
	ID        uuid.UUID  `json:"id"`
	Email     string     `json:"email"`
	Name      string     `json:"name"`
	AvatarURL string     `json:"avatar_url"`
	GitHubID  *string    `json:"github_id,omitempty"`
	GoogleID  *string    `json:"google_id,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// UserResponse is the public user data returned to clients
type UserResponse struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	AvatarURL string    `json:"avatar_url"`
	CreatedAt time.Time `json:"created_at"`
}

// ToResponse converts User to UserResponse
func (u *User) ToResponse() *UserResponse {
	return &UserResponse{
		ID:        u.ID.String(),
		Email:     u.Email,
		Name:      u.Name,
		AvatarURL: u.AvatarURL,
		CreatedAt: u.CreatedAt,
	}
}

// GitHubUserInfo represents the user info from GitHub API
type GitHubUserInfo struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
}

// GitHubEmail represents an email from GitHub API
type GitHubEmail struct {
	Email    string `json:"email"`
	Primary  bool   `json:"primary"`
	Verified bool   `json:"verified"`
}

// GoogleUserInfo represents the user info from Google API
type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

// TokenPair holds access and refresh tokens
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

// AuthResponse is returned after successful authentication
type AuthResponse struct {
	User   *UserResponse `json:"user"`
	Tokens *TokenPair    `json:"tokens"`
}

// JWTClaims represents the claims in our JWT
type JWTClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
}

package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/AnupamSingh2004/SysDes/backend/internal/shared/config"
	"github.com/AnupamSingh2004/SysDes/backend/internal/shared/logger"
)

// Service handles authentication business logic
type Service struct {
	repo   *Repository
	config *config.Config
}

// NewService creates a new auth service
func NewService(repo *Repository, cfg *config.Config) *Service {
	return &Service{
		repo:   repo,
		config: cfg,
	}
}

// ==================== JWT Methods ====================

// GenerateTokenPair generates access and refresh tokens for a user
func (s *Service) GenerateTokenPair(user *User) (*TokenPair, error) {
	// Access token - short lived
	accessToken, err := s.generateToken(user, time.Duration(s.config.JWTExpiryHours)*time.Hour)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	// Refresh token - long lived (30 days)
	refreshToken, err := s.generateToken(user, 30*24*time.Hour)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    s.config.JWTExpiryHours * 3600,
		TokenType:    "Bearer",
	}, nil
}

// generateToken creates a JWT token for a user
func (s *Service) generateToken(user *User, expiry time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"sub":   user.ID.String(),
		"email": user.Email,
		"name":  user.Name,
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(expiry).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.config.JWTSecret))
}

// ValidateToken validates a JWT token and returns the claims
func (s *Service) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.JWTSecret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return &JWTClaims{
			UserID: claims["sub"].(string),
			Email:  claims["email"].(string),
		}, nil
	}

	return nil, fmt.Errorf("invalid token claims")
}

// ==================== GitHub OAuth ====================

// GetGitHubAuthURL returns the GitHub OAuth authorization URL
func (s *Service) GetGitHubAuthURL(state string) string {
	params := url.Values{
		"client_id":    {s.config.GitHubClientID},
		"redirect_uri": {s.config.GitHubRedirectURL},
		"scope":        {"read:user user:email"},
		"state":        {state},
	}

	return fmt.Sprintf("https://github.com/login/oauth/authorize?%s", params.Encode())
}

// ExchangeGitHubCode exchanges a GitHub authorization code for tokens and user info
func (s *Service) ExchangeGitHubCode(ctx context.Context, code string) (*AuthResponse, error) {
	// Exchange code for access token
	accessToken, err := s.getGitHubAccessToken(code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange github code: %w", err)
	}

	// Get user info from GitHub
	githubUser, err := s.getGitHubUserInfo(accessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to get github user info: %w", err)
	}

	// Get user email if not public
	if githubUser.Email == "" {
		email, err := s.getGitHubUserEmail(accessToken)
		if err != nil {
			logger.Warn().Err(err).Msg("Failed to get GitHub user email")
		} else {
			githubUser.Email = email
		}
	}

	if githubUser.Email == "" {
		return nil, fmt.Errorf("github account does not have a verified email")
	}

	// Find or create user
	user, err := s.findOrCreateGitHubUser(ctx, githubUser)
	if err != nil {
		return nil, fmt.Errorf("failed to find or create user: %w", err)
	}

	// Generate tokens
	tokens, err := s.GenerateTokenPair(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	return &AuthResponse{
		User:   user.ToResponse(),
		Tokens: tokens,
	}, nil
}

func (s *Service) getGitHubAccessToken(code string) (string, error) {
	data := url.Values{
		"client_id":     {s.config.GitHubClientID},
		"client_secret": {s.config.GitHubClientSecret},
		"code":          {code},
		"redirect_uri":  {s.config.GitHubRedirectURL},
	}

	req, err := http.NewRequest("POST", "https://github.com/login/oauth/access_token", strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var result struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	if result.Error != "" {
		return "", fmt.Errorf("%s: %s", result.Error, result.ErrorDesc)
	}

	return result.AccessToken, nil
}

func (s *Service) getGitHubUserInfo(accessToken string) (*GitHubUserInfo, error) {
	req, err := http.NewRequest("GET", "https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("github api error: %s", string(body))
	}

	var user GitHubUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

func (s *Service) getGitHubUserEmail(accessToken string) (string, error) {
	req, err := http.NewRequest("GET", "https://api.github.com/user/emails", nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var emails []GitHubEmail
	if err := json.NewDecoder(resp.Body).Decode(&emails); err != nil {
		return "", err
	}

	// Find primary verified email
	for _, email := range emails {
		if email.Primary && email.Verified {
			return email.Email, nil
		}
	}

	// Fallback to any verified email
	for _, email := range emails {
		if email.Verified {
			return email.Email, nil
		}
	}

	return "", fmt.Errorf("no verified email found")
}

func (s *Service) findOrCreateGitHubUser(ctx context.Context, githubUser *GitHubUserInfo) (*User, error) {
	githubID := strconv.FormatInt(githubUser.ID, 10)

	// Try to find by GitHub ID
	user, err := s.repo.FindByGitHubID(ctx, githubID)
	if err != nil {
		return nil, err
	}
	if user != nil {
		return user, nil
	}

	// Try to find by email and link GitHub account
	user, err = s.repo.FindByEmail(ctx, githubUser.Email)
	if err != nil {
		return nil, err
	}
	if user != nil {
		// Link GitHub account to existing user
		if err := s.repo.UpdateGitHubID(ctx, user.ID, githubID); err != nil {
			return nil, err
		}
		user.GitHubID = &githubID
		return user, nil
	}

	// Create new user
	name := githubUser.Name
	if name == "" {
		name = githubUser.Login
	}

	return s.repo.Create(ctx, githubUser.Email, name, githubUser.AvatarURL, &githubID, nil)
}

// ==================== Google OAuth ====================

// GetGoogleAuthURL returns the Google OAuth authorization URL
func (s *Service) GetGoogleAuthURL(state string) string {
	params := url.Values{
		"client_id":     {s.config.GoogleClientID},
		"redirect_uri":  {s.config.GoogleRedirectURL},
		"response_type": {"code"},
		"scope":         {"openid email profile"},
		"state":         {state},
		"access_type":   {"offline"},
	}

	return fmt.Sprintf("https://accounts.google.com/o/oauth2/v2/auth?%s", params.Encode())
}

// ExchangeGoogleCode exchanges a Google authorization code for tokens and user info
func (s *Service) ExchangeGoogleCode(ctx context.Context, code string) (*AuthResponse, error) {
	// Exchange code for access token
	accessToken, err := s.getGoogleAccessToken(code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange google code: %w", err)
	}

	// Get user info from Google
	googleUser, err := s.getGoogleUserInfo(accessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to get google user info: %w", err)
	}

	if googleUser.Email == "" {
		return nil, fmt.Errorf("google account does not have an email")
	}

	// Find or create user
	user, err := s.findOrCreateGoogleUser(ctx, googleUser)
	if err != nil {
		return nil, fmt.Errorf("failed to find or create user: %w", err)
	}

	// Generate tokens
	tokens, err := s.GenerateTokenPair(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	return &AuthResponse{
		User:   user.ToResponse(),
		Tokens: tokens,
	}, nil
}

func (s *Service) getGoogleAccessToken(code string) (string, error) {
	data := url.Values{
		"client_id":     {s.config.GoogleClientID},
		"client_secret": {s.config.GoogleClientSecret},
		"code":          {code},
		"redirect_uri":  {s.config.GoogleRedirectURL},
		"grant_type":    {"authorization_code"},
	}

	resp, err := http.PostForm("https://oauth2.googleapis.com/token", data)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if result.Error != "" {
		return "", fmt.Errorf("%s: %s", result.Error, result.ErrorDesc)
	}

	return result.AccessToken, nil
}

func (s *Service) getGoogleUserInfo(accessToken string) (*GoogleUserInfo, error) {
	req, err := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("google api error: %s", string(body))
	}

	var user GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

func (s *Service) findOrCreateGoogleUser(ctx context.Context, googleUser *GoogleUserInfo) (*User, error) {
	// Try to find by Google ID
	user, err := s.repo.FindByGoogleID(ctx, googleUser.ID)
	if err != nil {
		return nil, err
	}
	if user != nil {
		return user, nil
	}

	// Try to find by email and link Google account
	user, err = s.repo.FindByEmail(ctx, googleUser.Email)
	if err != nil {
		return nil, err
	}
	if user != nil {
		// Link Google account to existing user
		if err := s.repo.UpdateGoogleID(ctx, user.ID, googleUser.ID); err != nil {
			return nil, err
		}
		user.GoogleID = &googleUser.ID
		return user, nil
	}

	// Create new user
	return s.repo.Create(ctx, googleUser.Email, googleUser.Name, googleUser.Picture, nil, &googleUser.ID)
}

// ==================== User Methods ====================

// GetUserByID returns a user by their ID
func (s *Service) GetUserByID(ctx context.Context, userID string) (*User, error) {
	id, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}

	return s.repo.FindByID(ctx, id)
}

// RefreshTokens generates new tokens from a valid refresh token
func (s *Service) RefreshTokens(ctx context.Context, refreshToken string) (*AuthResponse, error) {
	claims, err := s.ValidateToken(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	user, err := s.GetUserByID(ctx, claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	if user == nil {
		return nil, fmt.Errorf("user not found")
	}

	tokens, err := s.GenerateTokenPair(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	return &AuthResponse{
		User:   user.ToResponse(),
		Tokens: tokens,
	}, nil
}

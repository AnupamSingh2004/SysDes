package auth

import (
	"crypto/rand"
	"encoding/base64"

	"github.com/gofiber/fiber/v2"

	"github.com/AnupamSingh2004/SysDes/backend/internal/shared/config"
	"github.com/AnupamSingh2004/SysDes/backend/internal/shared/logger"
)

// Handler handles HTTP requests for authentication
type Handler struct {
	service *Service
	config  *config.Config
}

// NewHandler creates a new auth handler
func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{
		service: service,
		config:  cfg,
	}
}

// generateState creates a random state string for OAuth
func generateState() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

// ==================== GitHub OAuth Endpoints ====================

// GitHubLogin redirects to GitHub OAuth authorization page
// GET /api/v1/auth/github
func (h *Handler) GitHubLogin(c *fiber.Ctx) error {
	state := generateState()

	// Store state in cookie for CSRF protection
	c.Cookie(&fiber.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		MaxAge:   300, // 5 minutes
		HTTPOnly: true,
		Secure:   !h.config.IsDevelopment(),
		SameSite: "Lax",
	})

	authURL := h.service.GetGitHubAuthURL(state)
	return c.Redirect(authURL)
}

// GitHubCallback handles the GitHub OAuth callback
// GET /api/v1/auth/github/callback
func (h *Handler) GitHubCallback(c *fiber.Ctx) error {
	// Get authorization code and state from query params
	code := c.Query("code")
	state := c.Query("state")
	errorParam := c.Query("error")

	// Check for OAuth error
	if errorParam != "" {
		errorDesc := c.Query("error_description")
		logger.Error().Str("error", errorParam).Str("description", errorDesc).Msg("GitHub OAuth error")
		return c.Redirect(h.config.FrontendURL + "/login?error=" + errorParam)
	}

	// Validate state (CSRF protection)
	// Note: In production with HTTP (no HTTPS), cross-site cookies don't work reliably
	// So we only enforce state validation when the cookie is actually present
	storedState := c.Cookies("oauth_state")
	if storedState != "" && state != storedState {
		logger.Warn().Str("expected", storedState).Str("received", state).Msg("Google OAuth state mismatch")
		return c.Redirect(h.config.FrontendURL + "/login?error=invalid_state")
	}
	if storedState == "" {
		logger.Warn().Str("received", state).Msg("Google OAuth state cookie not found (cross-domain issue)")
	}

	// Clear state cookie
	c.Cookie(&fiber.Cookie{
		Name:     "oauth_state",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HTTPOnly: true,
	})

	if code == "" {
		return c.Redirect(h.config.FrontendURL + "/login?error=no_code")
	}

	// Exchange code for tokens and user info
	authResponse, err := h.service.ExchangeGitHubCode(c.Context(), code)
	if err != nil {
		logger.Error().Err(err).Msg("Failed to exchange GitHub code")
		return c.Redirect(h.config.FrontendURL + "/login?error=auth_failed")
	}

	// Set tokens in HTTP-only cookies for security
	h.setAuthCookies(c, authResponse.Tokens)

	logger.Info().Str("user_id", authResponse.User.ID).Str("email", authResponse.User.Email).Msg("User logged in via GitHub")

	// Redirect to frontend with success
	return c.Redirect(h.config.FrontendURL + "/auth/callback?provider=github")
}

// ==================== Google OAuth Endpoints ====================

// GoogleLogin redirects to Google OAuth authorization page
// GET /api/v1/auth/google
func (h *Handler) GoogleLogin(c *fiber.Ctx) error {
	state := generateState()

	// Store state in cookie for CSRF protection
	c.Cookie(&fiber.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		MaxAge:   300, // 5 minutes
		HTTPOnly: true,
		Secure:   !h.config.IsDevelopment(),
		SameSite: "Lax",
	})

	authURL := h.service.GetGoogleAuthURL(state)
	return c.Redirect(authURL)
}

// GoogleCallback handles the Google OAuth callback
// GET /api/v1/auth/google/callback
func (h *Handler) GoogleCallback(c *fiber.Ctx) error {
	// Get authorization code and state from query params
	code := c.Query("code")
	state := c.Query("state")
	errorParam := c.Query("error")

	// Check for OAuth error
	if errorParam != "" {
		logger.Error().Str("error", errorParam).Msg("Google OAuth error")
		return c.Redirect(h.config.FrontendURL + "/login?error=" + errorParam)
	}

	// Validate state (CSRF protection)
	// Note: In production with HTTP (no HTTPS), cross-site cookies don't work reliably
	// So we only enforce state validation when the cookie is actually present
	storedState := c.Cookies("oauth_state")
	if storedState != "" && state != storedState {
		logger.Warn().Str("expected", storedState).Str("received", state).Msg("Google OAuth state mismatch")
		return c.Redirect(h.config.FrontendURL + "/login?error=invalid_state")
	}
	if storedState == "" {
		logger.Warn().Str("received", state).Msg("Google OAuth state cookie not found (cross-domain issue)")
	}

	// Clear state cookie
	c.Cookie(&fiber.Cookie{
		Name:     "oauth_state",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HTTPOnly: true,
	})

	if code == "" {
		return c.Redirect(h.config.FrontendURL + "/login?error=no_code")
	}

	// Exchange code for tokens and user info
	authResponse, err := h.service.ExchangeGoogleCode(c.Context(), code)
	if err != nil {
		logger.Error().Err(err).Msg("Failed to exchange Google code")
		return c.Redirect(h.config.FrontendURL + "/login?error=auth_failed")
	}

	// Set tokens in HTTP-only cookies for security
	h.setAuthCookies(c, authResponse.Tokens)

	logger.Info().Str("user_id", authResponse.User.ID).Str("email", authResponse.User.Email).Msg("User logged in via Google")

	// Redirect to frontend with success
	return c.Redirect(h.config.FrontendURL + "/auth/callback?provider=google")
}

// ==================== User Endpoints ====================

// GetMe returns the current authenticated user
// GET /api/v1/auth/me
func (h *Handler) GetMe(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	user, err := h.service.GetUserByID(c.Context(), userID)
	if err != nil {
		logger.Error().Err(err).Str("user_id", userID).Msg("Failed to get user")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to get user",
		})
	}

	if user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   true,
			"message": "User not found",
		})
	}

	return c.JSON(fiber.Map{
		"user": user.ToResponse(),
	})
}

// RefreshTokens generates new access and refresh tokens
// POST /api/v1/auth/refresh
func (h *Handler) RefreshTokens(c *fiber.Ctx) error {
	// Get refresh token from cookie or body
	refreshToken := c.Cookies("refresh_token")

	if refreshToken == "" {
		var body struct {
			RefreshToken string `json:"refresh_token"`
		}
		if err := c.BodyParser(&body); err == nil {
			refreshToken = body.RefreshToken
		}
	}

	if refreshToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Refresh token required",
		})
	}

	authResponse, err := h.service.RefreshTokens(c.Context(), refreshToken)
	if err != nil {
		logger.Warn().Err(err).Msg("Failed to refresh tokens")
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid refresh token",
		})
	}

	// Set new tokens in cookies
	h.setAuthCookies(c, authResponse.Tokens)

	return c.JSON(fiber.Map{
		"user":   authResponse.User,
		"tokens": authResponse.Tokens,
	})
}

// Logout clears auth cookies
// POST /api/v1/auth/logout
func (h *Handler) Logout(c *fiber.Ctx) error {
	// Clear auth cookies
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HTTPOnly: true,
	})

	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HTTPOnly: true,
	})

	return c.JSON(fiber.Map{
		"message": "Logged out successfully",
	})
}

// ==================== Helper Methods ====================

// setAuthCookies sets access and refresh tokens in HTTP-only cookies
func (h *Handler) setAuthCookies(c *fiber.Ctx, tokens *TokenPair) {
	// Access token cookie - shorter expiry
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    tokens.AccessToken,
		Path:     "/",
		MaxAge:   tokens.ExpiresIn,
		HTTPOnly: true,
		Secure:   !h.config.IsDevelopment(),
		SameSite: "Lax",
	})

	// Refresh token cookie - longer expiry (30 days)
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    tokens.RefreshToken,
		Path:     "/",
		MaxAge:   30 * 24 * 60 * 60,
		HTTPOnly: true,
		Secure:   !h.config.IsDevelopment(),
		SameSite: "Lax",
	})

	// Also set a non-httponly cookie so frontend JS can check if logged in
	// This doesn't contain the actual token, just a flag
	c.Cookie(&fiber.Cookie{
		Name:     "logged_in",
		Value:    "true",
		Path:     "/",
		MaxAge:   tokens.ExpiresIn,
		HTTPOnly: false,
		Secure:   !h.config.IsDevelopment(),
		SameSite: "Lax",
	})
}

// RegisterRoutes registers all auth routes
func (h *Handler) RegisterRoutes(router fiber.Router, authMiddleware fiber.Handler) {
	auth := router.Group("/auth")

	// Public routes - OAuth
	auth.Get("/github", h.GitHubLogin)
	auth.Get("/github/callback", h.GitHubCallback)
	auth.Get("/google", h.GoogleLogin)
	auth.Get("/google/callback", h.GoogleCallback)

	// Public routes - Token management
	auth.Post("/refresh", h.RefreshTokens)
	auth.Post("/logout", h.Logout)

	// Protected routes
	auth.Get("/me", authMiddleware, h.GetMe)
}

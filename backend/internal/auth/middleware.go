package auth

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/AnupamSingh2004/SysDes/backend/internal/shared/logger"
)

// Middleware provides authentication middleware
type Middleware struct {
	service *Service
}

// NewMiddleware creates a new auth middleware
func NewMiddleware(service *Service) *Middleware {
	return &Middleware{service: service}
}

// RequireAuth is middleware that requires a valid JWT token
// It checks both the Authorization header and cookies for the token
// On success, it sets userID and userEmail in c.Locals()
func (m *Middleware) RequireAuth(c *fiber.Ctx) error {
	var token string

	// First, try Authorization header (Bearer token)
	authHeader := c.Get("Authorization")
	if authHeader != "" {
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
			token = parts[1]
		}
	}

	// If no header, try cookie
	if token == "" {
		token = c.Cookies("access_token")
	}

	// No token found anywhere
	if token == "" {
		logger.Debug().Str("path", c.Path()).Msg("No auth token provided")
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   true,
			"message": "Authentication required",
		})
	}

	// Validate the token
	claims, err := m.service.ValidateToken(token)
	if err != nil {
		logger.Debug().Err(err).Str("path", c.Path()).Msg("Invalid auth token")
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid or expired token",
		})
	}

	// Store user info in context for handlers to use
	c.Locals("userID", claims.UserID)
	c.Locals("userEmail", claims.Email)

	return c.Next()
}

// OptionalAuth is middleware that extracts user info if token is present
// but doesn't require authentication - useful for public routes that
// can show additional info for logged-in users
func (m *Middleware) OptionalAuth(c *fiber.Ctx) error {
	var token string

	// Try Authorization header
	authHeader := c.Get("Authorization")
	if authHeader != "" {
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
			token = parts[1]
		}
	}

	// Try cookie
	if token == "" {
		token = c.Cookies("access_token")
	}

	// If token found, try to validate it
	if token != "" {
		claims, err := m.service.ValidateToken(token)
		if err == nil {
			c.Locals("userID", claims.UserID)
			c.Locals("userEmail", claims.Email)
		}
		// Don't return error if invalid - just continue without auth
	}

	return c.Next()
}

// GetUserID extracts the user ID from context (set by middleware)
// Returns empty string if not authenticated
func GetUserID(c *fiber.Ctx) string {
	if userID := c.Locals("userID"); userID != nil {
		return userID.(string)
	}
	return ""
}

// GetUserEmail extracts the user email from context (set by middleware)
// Returns empty string if not authenticated
func GetUserEmail(c *fiber.Ctx) string {
	if email := c.Locals("userEmail"); email != nil {
		return email.(string)
	}
	return ""
}

// IsAuthenticated checks if the request is authenticated
func IsAuthenticated(c *fiber.Ctx) bool {
	return GetUserID(c) != ""
}

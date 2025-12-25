package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server
	Env  string
	Port string

	// Database
	DatabaseURL string

	// Redis
	RedisURL string

	// JWT
	JWTSecret      string
	JWTExpiryHours int

	// OAuth - GitHub
	GitHubClientID     string
	GitHubClientSecret string
	GitHubRedirectURL  string

	// OAuth - Google
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string

	// AI
	GeminiAPIKey string

	// Frontend
	FrontendURL string
}

func Load() *Config {
	// Load .env file if it exists (development)
	_ = godotenv.Load()

	return &Config{
		// Server
		Env:  getEnv("ENV", "development"),
		Port: getEnv("PORT", "4000"),

		// Database
		DatabaseURL: getEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sysdes?sslmode=disable"),

		// Redis
		RedisURL: getEnv("REDIS_URL", "localhost:6379"),

		// JWT
		JWTSecret:      getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		JWTExpiryHours: getEnvInt("JWT_EXPIRY_HOURS", 168), // 7 days

		// OAuth - GitHub
		GitHubClientID:     getEnv("GITHUB_CLIENT_ID", ""),
		GitHubClientSecret: getEnv("GITHUB_CLIENT_SECRET", ""),
		GitHubRedirectURL:  getEnv("GITHUB_REDIRECT_URL", "http://localhost:4000/api/v1/auth/github/callback"),

		// OAuth - Google
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:4000/api/v1/auth/google/callback"),

		// AI
		GeminiAPIKey: getEnv("GEMINI_API_KEY", ""),

		// Frontend
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// IsDevelopment returns true if running in development mode
func (c *Config) IsDevelopment() bool {
	return c.Env == "development"
}

// IsProduction returns true if running in production mode
func (c *Config) IsProduction() bool {
	return c.Env == "production"
}

package main

import (
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/AnupamSingh2004/SysDes/backend/internal/auth"
	"github.com/AnupamSingh2004/SysDes/backend/internal/shared/config"
	"github.com/AnupamSingh2004/SysDes/backend/internal/shared/database"
	"github.com/AnupamSingh2004/SysDes/backend/internal/shared/logger"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize logger
	logger.Init(cfg.Env)
	logger.Info().Str("env", cfg.Env).Msg("🚀 Starting SysDes Backend")

	// Connect to database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		logger.Fatal().Err(err).Msg("❌ Failed to connect to database")
	}
	defer database.Close()

	// Initialize auth domain
	// Repository -> Service -> Handler pattern (dependency injection)
	authRepo := auth.NewRepository(db)
	authService := auth.NewService(authRepo, cfg)
	authHandler := auth.NewHandler(authService, cfg)
	authMiddleware := auth.NewMiddleware(authService)

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "SysDes API",
		ErrorHandler: errorHandler,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(fiberlogger.New(fiberlogger.Config{
		Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.FrontendURL,
		AllowMethods:     "GET,POST,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	}))

	// Setup routes
	setupRoutes(app, cfg, authHandler, authMiddleware)

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		logger.Info().Msg("🛑 Shutting down server...")
		_ = app.Shutdown()
	}()

	// Start server
	logger.Info().Str("port", cfg.Port).Msg("🌐 Server listening")
	if err := app.Listen(":" + cfg.Port); err != nil {
		logger.Fatal().Err(err).Msg("❌ Server failed to start")
	}
}

func setupRoutes(app *fiber.App, cfg *config.Config, authHandler *auth.Handler, authMiddleware *auth.Middleware) {
	// API v1
	api := app.Group("/api/v1")

	// Health check
	api.Get("/health", func(c *fiber.Ctx) error {
		// Check database connection
		if err := database.Health(); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status":   "unhealthy",
				"database": "disconnected",
				"error":    err.Error(),
			})
		}

		return c.JSON(fiber.Map{
			"status":   "healthy",
			"service":  "sysdes-api",
			"version":  "1.0.0",
			"database": "connected",
		})
	})

	// Root endpoint
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"name":    "SysDes API",
			"version": "1.0.0",
			"docs":    "/api/v1/health",
		})
	})

	// Auth routes
	authHandler.RegisterRoutes(api, authMiddleware.RequireAuth)

	// TODO: Add more routes as we build each domain
	// - Project routes
	// - Whiteboard routes
	// - AI routes
}

// Custom error handler
func errorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	logger.Error().Err(err).Int("code", code).Str("path", c.Path()).Msg("Request error")

	return c.Status(code).JSON(fiber.Map{
		"error":   true,
		"message": message,
	})
}

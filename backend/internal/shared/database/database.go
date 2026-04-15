package database

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/AnupamSingh2004/SysDes/backend/internal/shared/logger"
)

var Pool *pgxpool.Pool

// Connect establishes a connection pool to PostgreSQL
func Connect(databaseURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}

	// Connection pool settings
	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute
	config.HealthCheckPeriod = time.Minute

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, err
	}

	// Test the connection
	if err := pool.Ping(ctx); err != nil {
		return nil, err
	}

	Pool = pool
	logger.Info().Msg("✅ Connected to PostgreSQL")

	return pool, nil
}

// Close closes the database connection pool
func Close() {
	if Pool != nil {
		Pool.Close()
		logger.Info().Msg("🔌 Disconnected from PostgreSQL")
	}
}

// Health checks if the database connection is healthy
func Health() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return Pool.Ping(ctx)
}

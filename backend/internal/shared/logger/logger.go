package logger

import (
	"os"
	"time"

	"github.com/rs/zerolog"
)

var Log zerolog.Logger

// Init initializes the global logger
func Init(env string) {
	if env == "development" {
		// Pretty console output for development
		Log = zerolog.New(zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: time.RFC3339,
		}).With().Timestamp().Caller().Logger()
	} else {
		// JSON output for production
		Log = zerolog.New(os.Stdout).With().Timestamp().Logger()
	}

	zerolog.SetGlobalLevel(zerolog.InfoLevel)
	if env == "development" {
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	}
}

// Debug logs a debug message
func Debug() *zerolog.Event {
	return Log.Debug()
}

// Info logs an info message
func Info() *zerolog.Event {
	return Log.Info()
}

// Warn logs a warning message
func Warn() *zerolog.Event {
	return Log.Warn()
}

// Error logs an error message
func Error() *zerolog.Event {
	return Log.Error()
}

// Fatal logs a fatal message and exits
func Fatal() *zerolog.Event {
	return Log.Fatal()
}

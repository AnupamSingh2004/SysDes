package errors

import (
	"fmt"
	"net/http"
)

// AppError represents an application error
type AppError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

func (e *AppError) Error() string {
	return e.Message
}

// Common errors
var (
	ErrNotFound        = &AppError{Code: http.StatusNotFound, Message: "Resource not found"}
	ErrUnauthorized    = &AppError{Code: http.StatusUnauthorized, Message: "Unauthorized"}
	ErrForbidden       = &AppError{Code: http.StatusForbidden, Message: "Forbidden"}
	ErrBadRequest      = &AppError{Code: http.StatusBadRequest, Message: "Bad request"}
	ErrInternalServer  = &AppError{Code: http.StatusInternalServerError, Message: "Internal server error"}
	ErrValidation      = &AppError{Code: http.StatusUnprocessableEntity, Message: "Validation error"}
	ErrConflict        = &AppError{Code: http.StatusConflict, Message: "Resource already exists"}
	ErrTooManyRequests = &AppError{Code: http.StatusTooManyRequests, Message: "Too many requests"}
)

// New creates a new AppError
func New(code int, message string) *AppError {
	return &AppError{Code: code, Message: message}
}

// WithDetails adds details to an error
func (e *AppError) WithDetails(details string) *AppError {
	return &AppError{
		Code:    e.Code,
		Message: e.Message,
		Details: details,
	}
}

// Wrap wraps an error with additional context
func Wrap(err error, message string) *AppError {
	return &AppError{
		Code:    http.StatusInternalServerError,
		Message: message,
		Details: err.Error(),
	}
}

// NotFound creates a not found error with custom message
func NotFound(resource string) *AppError {
	return &AppError{
		Code:    http.StatusNotFound,
		Message: fmt.Sprintf("%s not found", resource),
	}
}

// BadRequest creates a bad request error with custom message
func BadRequest(message string) *AppError {
	return &AppError{
		Code:    http.StatusBadRequest,
		Message: message,
	}
}

// Unauthorized creates an unauthorized error with custom message
func Unauthorized(message string) *AppError {
	return &AppError{
		Code:    http.StatusUnauthorized,
		Message: message,
	}
}

// Validation creates a validation error with details
func Validation(details string) *AppError {
	return &AppError{
		Code:    http.StatusUnprocessableEntity,
		Message: "Validation failed",
		Details: details,
	}
}

package whiteboard

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ============================================
// Shape Types (matching frontend types)
// ============================================

// Point represents a 2D coordinate
type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// ShapeStyle represents styling for shapes
type ShapeStyle struct {
	StrokeColor string  `json:"strokeColor"`
	StrokeWidth float64 `json:"strokeWidth"`
	StrokeStyle string  `json:"strokeStyle"` // "solid", "dashed", "dotted"
	FillColor   string  `json:"fillColor"`
	FillStyle   string  `json:"fillStyle"` // "solid", "hachure", "cross-hatch", "none"
	Opacity     float64 `json:"opacity"`
	Roughness   float64 `json:"roughness"`
}

// Shape represents a canvas shape (generic JSON for flexibility)
type Shape map[string]interface{}

// Viewport represents the canvas viewport state
type Viewport struct {
	ScrollX float64 `json:"scrollX"`
	ScrollY float64 `json:"scrollY"`
	Zoom    float64 `json:"zoom"`
}

// CanvasData represents the full canvas state
type CanvasData struct {
	Version   int        `json:"version"`
	Shapes    []Shape    `json:"shapes"`
	Viewport  Viewport   `json:"viewport"`
	Style     ShapeStyle `json:"style"`
	CreatedAt int64      `json:"createdAt"`
	UpdatedAt int64      `json:"updatedAt"`
}

// ============================================
// Database Models
// ============================================

// Whiteboard represents a whiteboard/canvas in the database
type Whiteboard struct {
	ID        uuid.UUID       `json:"id"`
	ProjectID uuid.UUID       `json:"project_id"`
	Name      string          `json:"name"`
	Data      json.RawMessage `json:"data"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

// WhiteboardResponse is the public whiteboard data returned to clients
type WhiteboardResponse struct {
	ID        string          `json:"id"`
	ProjectID string          `json:"project_id"`
	Name      string          `json:"name"`
	Data      json.RawMessage `json:"data"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

// ToResponse converts Whiteboard to WhiteboardResponse
func (w *Whiteboard) ToResponse() *WhiteboardResponse {
	return &WhiteboardResponse{
		ID:        w.ID.String(),
		ProjectID: w.ProjectID.String(),
		Name:      w.Name,
		Data:      w.Data,
		CreatedAt: w.CreatedAt,
		UpdatedAt: w.UpdatedAt,
	}
}

// ============================================
// Request/Response Types
// ============================================

// CreateWhiteboardRequest is the request body for creating a whiteboard
type CreateWhiteboardRequest struct {
	Name string          `json:"name" validate:"max=255"`
	Data json.RawMessage `json:"data"`
}

// UpdateWhiteboardRequest is the request body for updating a whiteboard
type UpdateWhiteboardRequest struct {
	Name *string          `json:"name,omitempty" validate:"omitempty,max=255"`
	Data *json.RawMessage `json:"data,omitempty"`
}

// SaveCanvasRequest is a simplified request for saving canvas data
type SaveCanvasRequest struct {
	Data json.RawMessage `json:"data" validate:"required"`
}

// WhiteboardListResponse is the response for listing whiteboards
type WhiteboardListResponse struct {
	Whiteboards []*WhiteboardResponse `json:"whiteboards"`
	Total       int                   `json:"total"`
}

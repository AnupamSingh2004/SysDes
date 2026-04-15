package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/AnupamSingh2004/SysDes/backend/internal/shared/logger"
)

const geminiAPIURL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

// Service handles AI-related operations
type Service struct {
	apiKey string
}

// NewService creates a new AI service
func NewService(apiKey string) *Service {
	return &Service{
		apiKey: apiKey,
	}
}

// InterpretSketch sends a sketch image to Gemini and extracts nodes/edges
func (s *Service) InterpretSketch(image, explanation string) (*InterpretResponse, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY is not configured")
	}

	// Build the prompt
	prompt := fmt.Sprintf(SketchInterpretationPrompt, explanation)

	// Create request body for Gemini Vision API
	requestBody := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{
						"text": prompt,
					},
					{
						"inline_data": map[string]interface{}{
							"mime_type": "image/png",
							"data":      image,
						},
					},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature":     0.2,
			"topK":            40,
			"topP":            0.95,
			"maxOutputTokens": 8192,
		},
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Make API request
	url := fmt.Sprintf("%s?key=%s", geminiAPIURL, s.apiKey)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to call Gemini API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		logger.Error().
			Int("status", resp.StatusCode).
			Str("body", string(body)).
			Msg("Gemini API error")
		return nil, fmt.Errorf("Gemini API returned status %d: %s", resp.StatusCode, string(body))
	}

	// Parse Gemini response
	var geminiResp GeminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to parse Gemini response: %w", err)
	}

	// Extract text from response
	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no response from Gemini")
	}

	text := geminiResp.Candidates[0].Content.Parts[0].Text

	// Log raw response for debugging
	logger.Debug().
		Str("raw_response", text[:min(len(text), 500)]).
		Msg("Raw Gemini response")

	// Clean up the response - remove markdown code blocks if present
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)

	// Log cleaned response
	logger.Debug().
		Str("cleaned_response", text[:min(len(text), 500)]).
		Msg("Cleaned AI response")

	// Parse the interpretation response
	var result InterpretResponse
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		logger.Error().
			Str("text", text).
			Err(err).
			Msg("Failed to parse AI response as JSON")
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	logger.Info().
		Int("nodes", len(result.Nodes)).
		Int("edges", len(result.Edges)).
		Float64("confidence", result.OverallConfidence).
		Msg("Successfully interpreted sketch")

	return &result, nil
}

// min helper function
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// GetSuggestions analyzes a design and returns improvement suggestions
func (s *Service) GetSuggestions(nodes []ExtractedNode, edges []ExtractedEdge, context string) (*SuggestResponse, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY is not configured")
	}

	// Serialize nodes and edges
	nodesJSON, _ := json.Marshal(nodes)
	edgesJSON, _ := json.Marshal(edges)

	// Build the prompt
	prompt := fmt.Sprintf(DesignSuggestionsPrompt, string(nodesJSON), string(edgesJSON), context)

	// Create request body
	requestBody := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{
						"text": prompt,
					},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature":     0.3,
			"topK":            40,
			"topP":            0.95,
			"maxOutputTokens": 4096,
		},
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Make API request
	url := fmt.Sprintf("%s?key=%s", geminiAPIURL, s.apiKey)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to call Gemini API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Gemini API returned status %d", resp.StatusCode)
	}

	// Parse Gemini response
	var geminiResp GeminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to parse Gemini response: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no response from Gemini")
	}

	text := geminiResp.Candidates[0].Content.Parts[0].Text

	// Clean up the response
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)

	// Parse the suggestions response
	var result SuggestResponse
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	logger.Info().
		Int("suggestions", len(result.Suggestions)).
		Msg("Successfully generated suggestions")

	return &result, nil
}

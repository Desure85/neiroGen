package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

const (
	defaultAPIURL     = "https://api.openai.com/v1/chat/completions"
	defaultModel      = "gpt-4o-mini"
	defaultTimeout    = 30 * time.Second
	defaultMaxRetries = 2
	
	// Groq API (free, fast)
	groqAPIURL     = "https://api.groq.com/openai/v1/chat/completions"
	groqModel      = "llama-3.3-70b-versatile"
	
	// Google Gemini (free tier)
	geminiAPIURL   = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent"
	geminiModel    = "gemini-1.5-flash"
)

// Client handles LLM API calls for shape generation
type Client struct {
	apiURL     string
	apiKey     string
	model      string
	httpClient *http.Client
}

// NewClient creates a new LLM client
func NewClient() *Client {
	provider := os.Getenv("LLM_PROVIDER")
	
	var apiKey, apiURL, model string
	
	switch strings.ToLower(provider) {
	case "groq":
		apiKey = os.Getenv("GROQ_API_KEY")
		apiURL = groqAPIURL
		model = groqModel
	case "gemini":
		apiKey = os.Getenv("GEMINI_API_KEY")
		apiURL = geminiAPIURL
		model = geminiModel
	case "openai", "":
		apiKey = os.Getenv("OPENAI_API_KEY")
		if apiKey == "" {
			apiKey = os.Getenv("LLM_API_KEY")
		}
		apiURL = defaultAPIURL
		model = defaultModel
	default:
		// Custom provider
		apiKey = os.Getenv("LLM_API_KEY")
		apiURL = os.Getenv("LLM_API_URL")
		model = os.Getenv("LLM_MODEL")
	}
	
	// Allow override via env vars
	if envURL := os.Getenv("LLM_API_URL"); envURL != "" {
		apiURL = envURL
	}
	if envModel := os.Getenv("LLM_MODEL"); envModel != "" {
		model = envModel
	}
	if envKey := os.Getenv("LLM_API_KEY"); envKey != "" && apiKey == "" {
		apiKey = envKey
	}

	return &Client{
		apiURL: apiURL,
		apiKey: apiKey,
		model:  model,
		httpClient: &http.Client{
			Timeout: defaultTimeout,
		},
	}
}

// IsAvailable checks if LLM integration is configured
func (c *Client) IsAvailable() bool {
	return c.apiKey != ""
}

// GenerateShapeRequest describes parameters for shape generation
type GenerateShapeRequest struct {
	Description string
	Width       int
	Height      int
	Difficulty  string
}

// GenerateShapeResponse contains generated shape coordinates
type GenerateShapeResponse struct {
	Points      []image.Point
	Description string
}

// GenerateShape uses LLM to generate shape coordinates based on description
func (c *Client) GenerateShape(ctx context.Context, req GenerateShapeRequest) (*GenerateShapeResponse, error) {
	if !c.IsAvailable() {
		return nil, fmt.Errorf("LLM API key not configured")
	}

	prompt := buildPrompt(req)

	// Call OpenAI API
	response, err := c.callAPI(ctx, prompt)
	if err != nil {
		return nil, fmt.Errorf("LLM API call failed: %w", err)
	}

	// Parse coordinates from response
	points, err := parseCoordinates(response)
	if err != nil {
		return nil, fmt.Errorf("failed to parse LLM response: %w", err)
	}

	// Validate and clip coordinates
	validatedPoints := validatePoints(points, req.Width, req.Height)
	if len(validatedPoints) < 3 {
		return nil, fmt.Errorf("LLM generated too few valid points: %d", len(validatedPoints))
	}

	return &GenerateShapeResponse{
		Points:      validatedPoints,
		Description: req.Description,
	}, nil
}

func buildPrompt(req GenerateShapeRequest) string {
	var targetPoints string

	switch req.Difficulty {
	case "easy":
		targetPoints = "8-15"
	case "medium":
		targetPoints = "15-30"
	case "hard":
		targetPoints = "30-50"
	default:
		targetPoints = "15-30"
	}

	return fmt.Sprintf(`Ты эксперт по созданию ГРАФИЧЕСКИХ ДИКТАНТОВ - это рисование по клеткам для детей.

ВАЖНО: Фигура должна быть УЗНАВАЕМОЙ и простой, как для раскраски.

ЗАДАЧА: Нарисуй "%s" на сетке %d×%d клеток.

ПРАВИЛА СОЗДАНИЯ КОНТУРА:
1. Думай как художник - сначала представь силуэт "%s"
2. Начни с ключевых точек (углы основных частей)
3. Соедини точки по периметру фигуры
4. Каждая следующая точка рядом с предыдущей (на расстоянии 1-3 клетки)
5. Замкни контур - вернись к первой точке

ПРИМЕРЫ ХОРОШИХ КОНТУРОВ:
- Кран: вертикальная стрела вверх + кабина внизу + противовес
- Домик: квадрат снизу + треугольная крыша сверху
- Ракета: узкий вытянутый корпус + носовой конус + стабилизаторы

ПЛОХИЕ КОНТУРЫ (НЕ ДЕЛАЙ ТАК):
- Случайные зигзаги
- Точки в разных частях сетки
- Абстрактные фигуры

КООРДИНАТЫ:
- X: от 0 до %d (слева направо)
- Y: от 0 до %d (сверху вниз)
- Используй %s точек

ФОРМАТ:
Верни ТОЛЬКО JSON, без текста до и после:
[{"x": 5, "y": 3}, {"x": 6, "y": 3}, {"x": 7, "y": 4}]

Нарисуй узнаваемый силуэт "%s":`, 
		req.Description, req.Width, req.Height,
		req.Description,
		req.Width-1, req.Height-1,
		targetPoints, req.Description)
}

type openAIRequest struct {
	Model    string    `json:"model"`
	Messages []message `json:"messages"`
	Temperature float64 `json:"temperature"`
	MaxTokens int `json:"max_tokens"`
}

type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error"`
}

func (c *Client) callAPI(ctx context.Context, prompt string) (string, error) {
	reqBody := openAIRequest{
		Model: c.model,
		Messages: []message{
			{
				Role:    "user",
				Content: prompt,
			},
		},
		Temperature: 0.3, // Низкая температура для более точных результатов
		MaxTokens:   2000,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("HTTP request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	var apiResp openAIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return "", fmt.Errorf("unmarshal response: %w", err)
	}

	if apiResp.Error != nil {
		return "", fmt.Errorf("API error: %s", apiResp.Error.Message)
	}

	if len(apiResp.Choices) == 0 {
		return "", fmt.Errorf("no choices in response")
	}

	return apiResp.Choices[0].Message.Content, nil
}

type coordinate struct {
	X int `json:"x"`
	Y int `json:"y"`
}

func parseCoordinates(response string) ([]image.Point, error) {
	// Extract JSON array from response (handle markdown code blocks)
	jsonStr := strings.TrimSpace(response)
	jsonStr = strings.TrimPrefix(jsonStr, "```json")
	jsonStr = strings.TrimPrefix(jsonStr, "```")
	jsonStr = strings.TrimSuffix(jsonStr, "```")
	jsonStr = strings.TrimSpace(jsonStr)

	var coords []coordinate
	if err := json.Unmarshal([]byte(jsonStr), &coords); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}

	points := make([]image.Point, len(coords))
	for i, c := range coords {
		points[i] = image.Point{X: c.X, Y: c.Y}
	}

	return points, nil
}

func validatePoints(points []image.Point, width, height int) []image.Point {
	validated := make([]image.Point, 0, len(points))

	for _, pt := range points {
		// Clip coordinates to grid bounds
		if pt.X < 0 {
			pt.X = 0
		}
		if pt.Y < 0 {
			pt.Y = 0
		}
		if pt.X >= width {
			pt.X = width - 1
		}
		if pt.Y >= height {
			pt.Y = height - 1
		}

		// Skip consecutive duplicates
		if len(validated) > 0 && validated[len(validated)-1] == pt {
			continue
		}

		validated = append(validated, pt)
	}

	return validated
}

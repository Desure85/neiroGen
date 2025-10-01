package shapes

import (
	"embed"
	"encoding/json"
	"fmt"
	"image"
	"io/fs"
	"math/rand"
	"strings"
)

//go:embed data/*.json
var embeddedTemplates embed.FS

type jsonPoint struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type jsonTemplate struct {
	Name           string        `json:"name"`
	DisplayName    string        `json:"display_name"`
	Difficulty     string        `json:"difficulty"`
	Categories     []string      `json:"categories"`
	Tags           []string      `json:"tags"`
	AllowDiagonals bool          `json:"allow_diagonals"`
	IncludeHoles   bool          `json:"include_holes"`
	Description    string        `json:"description"`
	BaseWidth      int           `json:"base_width"`
	BaseHeight     int           `json:"base_height"`
	Paths          [][]jsonPoint `json:"paths"`
}

func loadExternalTemplates() ([]*ShapeTemplate, error) {
	entries, err := fs.ReadDir(embeddedTemplates, "data")
	if err != nil {
		if strings.Contains(err.Error(), "file does not exist") {
			return nil, nil
		}
		return nil, fmt.Errorf("read embedded templates: %w", err)
	}

	templates := make([]*ShapeTemplate, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}

		b, err := embeddedTemplates.ReadFile("data/" + entry.Name())
		if err != nil {
			return nil, fmt.Errorf("read template %s: %w", entry.Name(), err)
		}

		tmpl, err := parseJSONTemplate(entry.Name(), b)
		if err != nil {
			return nil, err
		}
		templates = append(templates, tmpl)
	}

	return templates, nil
}

func parseJSONTemplate(filename string, data []byte) (*ShapeTemplate, error) {
	var payload jsonTemplate
	if err := json.Unmarshal(data, &payload); err != nil {
		return nil, fmt.Errorf("decode template %s: %w", filename, err)
	}

	if strings.TrimSpace(payload.Name) == "" {
		return nil, fmt.Errorf("template %s: name is required", filename)
	}

	if len(payload.Paths) == 0 {
		return nil, fmt.Errorf("template %s: paths must not be empty", filename)
	}

	basePaths := make([][]image.Point, len(payload.Paths))
	maxX := 0
	maxY := 0
	for i, path := range payload.Paths {
		if len(path) < 2 {
			return nil, fmt.Errorf("template %s: path %d must contain at least two points", filename, i)
		}
		converted := make([]image.Point, len(path))
		for j, pt := range path {
			converted[j] = image.Point{X: pt.X, Y: pt.Y}
			if pt.X > maxX {
				maxX = pt.X
			}
			if pt.Y > maxY {
				maxY = pt.Y
			}
		}
		basePaths[i] = converted
	}

	width := payload.BaseWidth
	height := payload.BaseHeight
	if width <= 0 {
		width = maxX + 1
	}
	if height <= 0 {
		height = maxY + 1
	}

	normalized := normalizePaths(basePaths)

	return &ShapeTemplate{
		Name:           strings.ToLower(payload.Name),
		DisplayName:    payload.DisplayName,
		Difficulty:     strings.ToLower(payload.Difficulty),
		Categories:     sortStrings(payload.Categories),
		Tags:           sortStrings(payload.Tags),
		AllowDiagonals: payload.AllowDiagonals,
		IncludeHoles:   payload.IncludeHoles,
		Description:    payload.Description,
		Generator: func(gridWidth, gridHeight int, rng *rand.Rand) [][]image.Point {
			return scalePaths(normalized, width, height, gridWidth, gridHeight)
		},
	}, nil
}

package shapes

import (
	"image"
	"math"
	"math/rand"
	"sort"
)

// TemplateGenerator возвращает набор путей для указанного размера сетки.
type TemplateGenerator func(gridWidth, gridHeight int, rng *rand.Rand) [][]image.Point

// ShapeTemplate описывает предустановленную фигуру.
type ShapeTemplate struct {
	Name           string
	DisplayName    string
	Difficulty     string
	Categories     []string
	Tags           []string
	AllowDiagonals bool
	IncludeHoles   bool
	Description    string
	Generator      TemplateGenerator
}

// TemplateSummary предназначен для API списка шаблонов.
type TemplateSummary struct {
	Name           string   `json:"name"`
	DisplayName    string   `json:"display_name"`
	Difficulty     string   `json:"difficulty"`
	Categories     []string `json:"categories"`
	Tags           []string `json:"tags"`
	AllowDiagonals bool     `json:"allow_diagonals"`
	IncludeHoles   bool     `json:"include_holes"`
	Description    string   `json:"description"`
}

// Summary возвращает краткое описание шаблона.
func (t *ShapeTemplate) Summary() TemplateSummary {
	return TemplateSummary{
		Name:           t.Name,
		DisplayName:    t.DisplayName,
		Difficulty:     t.Difficulty,
		Categories:     append([]string(nil), t.Categories...),
		Tags:           append([]string(nil), t.Tags...),
		AllowDiagonals: t.AllowDiagonals,
		IncludeHoles:   t.IncludeHoles,
		Description:    t.Description,
	}
}

func normalizePaths(base [][]image.Point) [][]image.Point {
	out := make([][]image.Point, len(base))
	for i, path := range base {
		dup := make([]image.Point, len(path))
		copy(dup, path)
		out[i] = dup
	}
	return out
}

func scalePaths(paths [][]image.Point, baseWidth, baseHeight, gridWidth, gridHeight int) [][]image.Point {
	if baseWidth <= 1 {
		baseWidth = 2
	}
	if baseHeight <= 1 {
		baseHeight = 2
	}

	sx := float64(gridWidth-1) / float64(baseWidth-1)
	sy := float64(gridHeight-1) / float64(baseHeight-1)

	scaled := make([][]image.Point, len(paths))
	for i, path := range paths {
		out := make([]image.Point, len(path))
		for j, pt := range path {
			x := int(math.Round(float64(pt.X) * sx))
			y := int(math.Round(float64(pt.Y) * sy))
			if x < 0 {
				x = 0
			}
			if y < 0 {
				y = 0
			}
			if gridWidth > 0 && x >= gridWidth {
				x = gridWidth - 1
			}
			if gridHeight > 0 && y >= gridHeight {
				y = gridHeight - 1
			}
			out[j] = image.Point{X: x, Y: y}
		}
		scaled[i] = out
	}
	return scaled
}

func sortStrings(values []string) []string {
	dup := append([]string(nil), values...)
	sort.Strings(dup)
	return dup
}

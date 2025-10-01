package shapes

import (
	"image"
	"math/rand"
)

// transform applies a point-wise transformation keeping grid size the same.
type transform func(gridW, gridH int, paths [][]image.Point) [][]image.Point

// mirrorX reflects paths horizontally across the vertical center.
func mirrorX(gridW, _ int, paths [][]image.Point) [][]image.Point {
	res := make([][]image.Point, len(paths))
	maxX := gridW - 1
	for i, path := range paths {
		out := make([]image.Point, len(path))
		for j, p := range path {
			out[j] = image.Point{X: maxX - p.X, Y: p.Y}
		}
		res[i] = out
	}
	return res
}

// mirrorY reflects paths vertically across the horizontal center.
func mirrorY(_ int, gridH int, paths [][]image.Point) [][]image.Point {
	res := make([][]image.Point, len(paths))
	maxY := gridH - 1
	for i, path := range paths {
		out := make([]image.Point, len(path))
		for j, p := range path {
			out[j] = image.Point{X: p.X, Y: maxY - p.Y}
		}
		res[i] = out
	}
	return res
}

// WithTransform returns a new template that applies transform T to the
// generated paths of base template.
func WithTransform(base *ShapeTemplate, nameSuffix, displaySuffix string, t transform) *ShapeTemplate {
	if base == nil {
		return nil
	}
	return &ShapeTemplate{
		Name:           base.Name + nameSuffix,
		DisplayName:    base.DisplayName + displaySuffix,
		Difficulty:     base.Difficulty,
		Categories:     append([]string(nil), base.Categories...),
		Tags:           append(append([]string(nil), base.Tags...), "variant"),
		AllowDiagonals: base.AllowDiagonals,
		IncludeHoles:   base.IncludeHoles,
		Description:    base.Description + " (вариация)",
		Generator: func(gridW, gridH int, rng *rand.Rand) [][]image.Point {
			paths := base.Generator(gridW, gridH, rng)
			return t(gridW, gridH, paths)
		},
	}
}

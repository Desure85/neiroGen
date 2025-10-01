package shapes

import (
	"image"
	"math/rand"
	"sync"
)

var (
	definitionsOnce sync.Once
	definitionsList []*ShapeTemplate
	definitionsErr  error
)

// Definitions возвращает все доступные шаблоны (встроенные + внешние JSON).
func Definitions() ([]*ShapeTemplate, error) {
	definitionsOnce.Do(func() {
		// базовые
		list := append([]*ShapeTemplate(nil), builtinTemplates...)

		// вариации (зеркальные отражения) для каждого базового
		variants := make([]*ShapeTemplate, 0, len(builtinTemplates)*2)
		for _, t := range builtinTemplates {
			if t == nil {
				continue
			}
			variants = append(variants,
				WithTransform(t, "-mx", " (зеркало X)", mirrorX),
				WithTransform(t, "-my", " (зеркало Y)", mirrorY),
			)
		}
		list = append(list, variants...)

		external, err := loadExternalTemplates()
		if err != nil {
			definitionsErr = err
			return
		}
		list = append(list, external...)
		definitionsList = list
	})
	return definitionsList, definitionsErr
}

var builtinTemplates = []*ShapeTemplate{
	makeSquareTemplate(),
	makeRectangleTemplate(),
	makeHouseTemplate(),
	makeTreeTemplate(),
	makeRocketTemplate(),
}

func simpleGenerator(base [][]image.Point, baseWidth, baseHeight int) TemplateGenerator {
	normalized := normalizePaths(base)
	return func(gridWidth, gridHeight int, rng *rand.Rand) [][]image.Point {
		return scalePaths(normalized, baseWidth, baseHeight, gridWidth, gridHeight)
	}
}

func makeSquareTemplate() *ShapeTemplate {
	base := [][]image.Point{{
		{X: 2, Y: 2}, {X: 13, Y: 2}, {X: 13, Y: 13}, {X: 2, Y: 13}, {X: 2, Y: 2},
	}}
	return &ShapeTemplate{
		Name:           "square",
		DisplayName:    "Квадрат",
		Difficulty:     "easy",
		Categories:     []string{"basic"},
		Tags:           []string{"квадрат", "square"},
		AllowDiagonals: false,
		IncludeHoles:   false,
		Description:    "Простой квадрат из ортогональных линий.",
		Generator:      simpleGenerator(base, 16, 16),
	}
}

func makeRectangleTemplate() *ShapeTemplate {
	base := [][]image.Point{{
		{X: 1, Y: 3}, {X: 14, Y: 3}, {X: 14, Y: 12}, {X: 1, Y: 12}, {X: 1, Y: 3},
	}}
	return &ShapeTemplate{
		Name:           "rectangle",
		DisplayName:    "Прямоугольник",
		Difficulty:     "easy",
		Categories:     []string{"basic"},
		Tags:           []string{"прямоугольник", "rectangle"},
		AllowDiagonals: false,
		IncludeHoles:   false,
		Description:    "Горизонтально вытянутый прямоугольник.",
		Generator:      simpleGenerator(base, 16, 16),
	}
}

func makeHouseTemplate() *ShapeTemplate {
	base := [][]image.Point{
		{
			{X: 4, Y: 8}, {X: 8, Y: 2}, {X: 12, Y: 8},
		},
		{
			{X: 4, Y: 8}, {X: 4, Y: 14}, {X: 12, Y: 14}, {X: 12, Y: 8},
		},
	}
	return &ShapeTemplate{
		Name:           "house",
		DisplayName:    "Домик",
		Difficulty:     "medium",
		Categories:     []string{"basic", "objects"},
		Tags:           []string{"дом", "домик", "house"},
		AllowDiagonals: true,
		IncludeHoles:   false,
		Description:    "Домик с треугольной крышей и квадратным основанием.",
		Generator:      simpleGenerator(base, 16, 16),
	}
}

func makeTreeTemplate() *ShapeTemplate {
	base := [][]image.Point{
		{{X: 8, Y: 2}, {X: 4, Y: 6}, {X: 12, Y: 6}, {X: 8, Y: 2}},
		{{X: 8, Y: 6}, {X: 3, Y: 10}, {X: 13, Y: 10}, {X: 8, Y: 6}},
		{{X: 7, Y: 10}, {X: 7, Y: 14}, {X: 9, Y: 14}, {X: 9, Y: 10}},
	}
	return &ShapeTemplate{
		Name:           "tree",
		DisplayName:    "Дерево",
		Difficulty:     "medium",
		Categories:     []string{"nature"},
		Tags:           []string{"дерево", "ёлка", "tree"},
		AllowDiagonals: true,
		IncludeHoles:   false,
		Description:    "Ёлка с двумя ярусами кроны и стволом.",
		Generator:      simpleGenerator(base, 16, 16),
	}
}

func makeRocketTemplate() *ShapeTemplate {
	body := []image.Point{
		{X: 8, Y: 1}, {X: 12, Y: 4}, {X: 12, Y: 11}, {X: 8, Y: 14}, {X: 4, Y: 11}, {X: 4, Y: 4}, {X: 8, Y: 1},
	}
	finLeft := []image.Point{{X: 4, Y: 11}, {X: 1, Y: 15}, {X: 4, Y: 15}}
	finRight := []image.Point{{X: 12, Y: 11}, {X: 15, Y: 15}, {X: 12, Y: 15}}
	window := []image.Point{{X: 8, Y: 6}, {X: 9, Y: 7}, {X: 8, Y: 8}, {X: 7, Y: 7}, {X: 8, Y: 6}}
	base := [][]image.Point{body, finLeft, finRight, window}
	return &ShapeTemplate{
		Name:           "rocket",
		DisplayName:    "Ракета",
		Difficulty:     "hard",
		Categories:     []string{"objects", "transport"},
		Tags:           []string{"ракета", "rocket"},
		AllowDiagonals: true,
		IncludeHoles:   true,
		Description:    "Ракета с иллюминатором и стабилизаторами.",
		Generator:      simpleGenerator(base, 16, 16),
	}
}

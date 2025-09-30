package shapes

import (
	"math/rand"
	"strings"
	"time"
)

// Matcher finds shapes based on text description or random selection
type Matcher struct {
	templates []ShapeTemplate
	rng       *rand.Rand
}

// NewMatcher creates a new shape matcher
func NewMatcher() *Matcher {
	return &Matcher{
		templates: GetTemplates(),
		rng:       rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// MatchDescription tries to find a shape matching the text description
// Returns nil if no match found
func (m *Matcher) MatchDescription(description string, difficulty string) *ShapeTemplate {
	desc := strings.ToLower(strings.TrimSpace(description))
	
	// Direct name matches
	keywords := map[string][]string{
		"square":      {"квадрат", "square"},
		"rectangle":   {"прямоугольник", "rectangle"},
		"house":       {"дом", "домик", "house"},
		"tree":        {"дерево", "ёлка", "елка", "tree"},
		"car":         {"машина", "машинка", "автомобиль", "car"},
		"boat":        {"лодка", "кораблик", "корабль", "boat"},
		"robot":       {"робот", "robot"},
		"crane":       {"кран", "подъёмный кран", "подъемный кран", "crane"},
		"airplane":    {"самолёт", "самолет", "airplane", "plane"},
		"rocket":      {"ракета", "rocket"},
		"butterfly":   {"бабочка", "butterfly"},
		"dog":         {"собака", "собачка", "пёс", "песик", "dog"},
		"cat":         {"кот", "кошка", "котик", "cat"},
		"mixer_truck": {"бетономешалка", "миксер", "mixer", "concrete mixer", "mixer truck"},
	}
	
	// Try to find by keywords
	for shapeName, words := range keywords {
		for _, word := range words {
			if strings.Contains(desc, word) {
				template := m.findByName(shapeName)
				if template != nil && (difficulty == "" || template.Difficulty == difficulty) {
					return template
				}
			}
		}
	}
	
	// Try to find by category
	categories := map[string][]string{
		"basic":      {"фигура", "простой", "basic", "shape"},
		"buildings":  {"здание", "постройка", "building"},
		"nature":     {"природа", "растение", "nature"},
		"transport":  {"транспорт", "transport", "vehicle"},
		"characters": {"персонаж", "character"},
		"animals":    {"животное", "зверь", "animal"},
	}
	
	for category, words := range categories {
		for _, word := range words {
			if strings.Contains(desc, word) {
				templates := m.findByCategory(category, difficulty)
				if len(templates) > 0 {
					return &templates[m.rng.Intn(len(templates))]
				}
			}
		}
	}
	
	return nil
}

// Random returns a random shape optionally filtered by difficulty
func (m *Matcher) Random(difficulty string) *ShapeTemplate {
	candidates := m.templates
	
	if difficulty != "" {
		filtered := make([]ShapeTemplate, 0)
		for _, t := range m.templates {
			if t.Difficulty == difficulty {
				filtered = append(filtered, t)
			}
		}
		if len(filtered) > 0 {
			candidates = filtered
		}
	}
	
	if len(candidates) == 0 {
		return nil
	}
	
	idx := m.rng.Intn(len(candidates))
	return &candidates[idx]
}

// GetByName returns a shape by exact name
func (m *Matcher) GetByName(name string) *ShapeTemplate {
	return m.findByName(name)
}

// ListByDifficulty returns all shapes for a given difficulty
func (m *Matcher) ListByDifficulty(difficulty string) []ShapeTemplate {
	result := make([]ShapeTemplate, 0)
	for _, t := range m.templates {
		if difficulty == "" || t.Difficulty == difficulty {
			result = append(result, t)
		}
	}
	return result
}

// findByName internal helper
func (m *Matcher) findByName(name string) *ShapeTemplate {
	for i := range m.templates {
		if m.templates[i].Name == name {
			return &m.templates[i]
		}
	}
	return nil
}

// findByCategory internal helper
func (m *Matcher) findByCategory(category string, difficulty string) []ShapeTemplate {
	result := make([]ShapeTemplate, 0)
	for _, t := range m.templates {
		if t.Category == category {
			if difficulty == "" || t.Difficulty == difficulty {
				result = append(result, t)
			}
		}
	}
	return result
}

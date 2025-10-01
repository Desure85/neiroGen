package shapes

import (
	"math/rand"
	"sort"
	"strings"
	"sync"
)

var matcherOnce sync.Once
var cachedMatcher *Matcher
var cachedMatcherErr error

// Matcher сопоставляет запросы с шаблонами по имени, описанию и сложности.
type Matcher struct {
	byName       map[string]*ShapeTemplate
	byDifficulty map[string][]*ShapeTemplate
	lexicon      map[string][]*ShapeTemplate
	all          []*ShapeTemplate
}

// NewMatcher создаёт новый экземпляр сопоставителя на основе шаблонов.
func NewMatcher(templates []*ShapeTemplate) *Matcher {
	byName := make(map[string]*ShapeTemplate)
	byDifficulty := make(map[string][]*ShapeTemplate)
	lexicon := make(map[string][]*ShapeTemplate)

	for _, tmpl := range templates {
		name := strings.ToLower(tmpl.Name)
		if name != "" {
			byName[name] = tmpl
		}

		d := strings.ToLower(strings.TrimSpace(tmpl.Difficulty))
		if d == "" {
			d = "medium"
		}
		byDifficulty[d] = append(byDifficulty[d], tmpl)

		keywords := collectKeywords(tmpl)
		for _, word := range keywords {
			lexicon[word] = append(lexicon[word], tmpl)
		}
	}

	for _, list := range byDifficulty {
		sort.Slice(list, func(i, j int) bool {
			return list[i].Name < list[j].Name
		})
	}

	return &Matcher{
		byName:       byName,
		byDifficulty: byDifficulty,
		lexicon:      lexicon,
		all:          templates,
	}
}

func collectKeywords(tmpl *ShapeTemplate) []string {
	keywords := make([]string, 0, len(tmpl.Tags)+len(tmpl.Categories)+4)
	keywords = append(keywords, strings.Fields(strings.ToLower(tmpl.Name))...)
	keywords = append(keywords, strings.Fields(strings.ToLower(tmpl.DisplayName))...)
	keywords = append(keywords, tmpl.Tags...)
	keywords = append(keywords, tmpl.Categories...)
	keywords = append(keywords, strings.Fields(strings.ToLower(tmpl.Description))...)

	unique := make(map[string]struct{})
	result := make([]string, 0, len(keywords))
	for _, word := range keywords {
		w := strings.TrimSpace(word)
		if w == "" {
			continue
		}
		w = strings.ToLower(w)
		if _, exists := unique[w]; exists {
			continue
		}
		unique[w] = struct{}{}
		result = append(result, w)
	}
	return result
}

// GetByName возвращает шаблон по имени.
func (m *Matcher) GetByName(name string) *ShapeTemplate {
	if m == nil {
		return nil
	}
	return m.byName[strings.ToLower(strings.TrimSpace(name))]
}

// MatchDescription пытается найти шаблон по описанию и сложности.
func (m *Matcher) MatchDescription(description, difficulty string) *ShapeTemplate {
	if m == nil {
		return nil
	}
	difficulty = strings.ToLower(strings.TrimSpace(difficulty))
	if difficulty == "" {
		difficulty = "medium"
	}

	words := strings.Fields(strings.ToLower(description))
	if len(words) == 0 {
		return nil
	}

	candidates := make(map[*ShapeTemplate]int)
	for _, word := range words {
		templates := m.lexicon[word]
		for _, tmpl := range templates {
			candidates[tmpl]++
		}
	}

	var best *ShapeTemplate
	bestScore := 0
	for tmpl, score := range candidates {
		if score < bestScore {
			continue
		}
		if score == bestScore {
			if best != nil && tmpl.Name >= best.Name {
				continue
			}
		}
		best = tmpl
		bestScore = score
	}

	if best != nil && strings.EqualFold(best.Difficulty, difficulty) {
		return best
	}

	list := m.byDifficulty[difficulty]
	if len(list) == 0 {
		return nil
	}
	return list[rand.Intn(len(list))]
}

// Random выбирает случайный шаблон указанной сложности.
func (m *Matcher) Random(difficulty string) *ShapeTemplate {
	if m == nil {
		return nil
	}
	difficulty = strings.ToLower(strings.TrimSpace(difficulty))
	if difficulty == "" {
		difficulty = "medium"
	}

	list := m.byDifficulty[difficulty]
	if len(list) == 0 {
		return nil
	}
	return list[rand.Intn(len(list))]
}

// AllSummaries возвращает сводку всех шаблонов (для API).
func (m *Matcher) AllSummaries() []TemplateSummary {
	if m == nil {
		return nil
	}
	summaries := make([]TemplateSummary, len(m.all))
	for i, tmpl := range m.all {
		summaries[i] = tmpl.Summary()
	}
	sort.Slice(summaries, func(i, j int) bool {
		return summaries[i].Name < summaries[j].Name
	})
	return summaries
}

// DefaultMatcher возвращает синглтон для встроенных шаблонов.
func DefaultMatcher() (*Matcher, error) {
	matcherOnce.Do(func() {
		templates, err := Definitions()
		if err != nil {
			cachedMatcherErr = err
			return
		}
		cachedMatcher = NewMatcher(templates)
	})
	return cachedMatcher, cachedMatcherErr
}

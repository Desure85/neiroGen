package generator

import (
	"fmt"
	"image"
	"math"
	"sort"

	"neirogen/app/server/generators/graphicdictation/internal/api"
)

type edgeKey struct {
	ax, ay, bx, by int
}

func makeEdgeKey(a, b image.Point) edgeKey {
	if a.X < b.X || (a.X == b.X && a.Y <= b.Y) {
		return edgeKey{ax: a.X, ay: a.Y, bx: b.X, by: b.Y}
	}
	return edgeKey{ax: b.X, ay: b.Y, bx: a.X, by: a.Y}
}

// buildContourPaths extracts contour paths from binary mask
func buildContourPaths(mask [][]bool, includeHoles bool) ([][]image.Point, error) {
	h := len(mask)
	if h == 0 {
		return nil, nil
	}
	w := len(mask[0])

	outside := markOutside(mask)
	adjacency := make(map[image.Point][]image.Point)
	edges := make(map[edgeKey]struct{})

	shouldInclude := func(nx, ny int) bool {
		if nx < 0 || ny < 0 || nx >= w || ny >= h {
			return true
		}
		if mask[ny][nx] {
			return false
		}
		if includeHoles {
			return true
		}
		return outside[ny][nx]
	}

	addEdge := func(a, b image.Point) {
		key := makeEdgeKey(a, b)
		if _, exists := edges[key]; exists {
			return
		}
		edges[key] = struct{}{}
		adjacency[a] = append(adjacency[a], b)
		adjacency[b] = append(adjacency[b], a)
	}

	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			if !mask[y][x] {
				continue
			}
			if shouldInclude(x, y-1) {
				a := image.Point{X: x, Y: y}
				b := image.Point{X: x + 1, Y: y}
				addEdge(a, b)
			}
			if shouldInclude(x+1, y) {
				a := image.Point{X: x + 1, Y: y}
				b := image.Point{X: x + 1, Y: y + 1}
				addEdge(a, b)
			}
			if shouldInclude(x, y+1) {
				a := image.Point{X: x + 1, Y: y + 1}
				b := image.Point{X: x, Y: y + 1}
				addEdge(a, b)
			}
			if shouldInclude(x-1, y) {
				a := image.Point{X: x, Y: y + 1}
				b := image.Point{X: x, Y: y}
				addEdge(a, b)
			}
		}
	}

	if len(adjacency) == 0 {
		return nil, nil
	}

	for node, neighbors := range adjacency {
		center := node
		sort.Slice(neighbors, func(i, j int) bool {
			a := neighbors[i]
			b := neighbors[j]
			angleA := math.Atan2(float64(a.Y-center.Y), float64(a.X-center.X))
			angleB := math.Atan2(float64(b.Y-center.Y), float64(b.X-center.X))
			return angleA < angleB
		})
		adjacency[node] = neighbors
	}

	used := make(map[edgeKey]bool)
	paths := make([][]image.Point, 0)

	for node, neighbors := range adjacency {
		for _, neighbor := range neighbors {
			key := makeEdgeKey(node, neighbor)
			if used[key] {
				continue
			}
			path := walkLoop(node, neighbor, adjacency, used)
			if len(path) > 1 && path[0] == path[len(path)-1] {
				paths = append(paths, path)
			}
		}
	}

	sort.Slice(paths, func(i, j int) bool {
		ai := paths[i][0]
		aj := paths[j][0]
		if ai.Y == aj.Y {
			return ai.X < aj.X
		}
		return ai.Y < aj.Y
	})

	return paths, nil
}

func walkLoop(start, next image.Point, adjacency map[image.Point][]image.Point, used map[edgeKey]bool) []image.Point {
	path := []image.Point{start}
	current := start
	prev := start

	for {
		key := makeEdgeKey(current, next)
		if used[key] {
			return nil
		}
		used[key] = true
		current = next
		path = append(path, current)
		if current == start {
			break
		}
		neighbors := adjacency[current]
		found := false
		for _, candidate := range neighbors {
			if candidate == prev {
				continue
			}
			candidateKey := makeEdgeKey(current, candidate)
			if used[candidateKey] {
				continue
			}
			next = candidate
			found = true
			break
		}
		if !found {
			for _, candidate := range neighbors {
				if candidate == start {
					next = candidate
					found = true
					break
				}
			}
		}
		if !found {
			return nil
		}
		prev = current
	}

	return path
}

func markOutside(mask [][]bool) [][]bool {
	h := len(mask)
	if h == 0 {
		return nil
	}
	w := len(mask[0])
	out := make([][]bool, h)
	for i := range out {
		out[i] = make([]bool, w)
	}

	type point struct{ x, y int }
	queue := make([]point, 0)
	push := func(x, y int) {
		if x < 0 || y < 0 || x >= w || y >= h {
			return
		}
		if mask[y][x] || out[y][x] {
			return
		}
		queue = append(queue, point{x: x, y: y})
	}

	for x := 0; x < w; x++ {
		push(x, 0)
		push(x, h-1)
	}
	for y := 0; y < h; y++ {
		push(0, y)
		push(w-1, y)
	}

	dirs := []image.Point{{1, 0}, {-1, 0}, {0, 1}, {0, -1}}

	for len(queue) > 0 {
		p := queue[0]
		queue = queue[1:]
		if out[p.y][p.x] {
			continue
		}
		out[p.y][p.x] = true
		for _, d := range dirs {
			nx := p.x + d.X
			ny := p.y + d.Y
			if nx < 0 || ny < 0 || nx >= w || ny >= h {
				continue
			}
			if mask[ny][nx] || out[ny][nx] {
				continue
			}
			queue = append(queue, point{x: nx, y: ny})
		}
	}

	return out
}

func buildCommandsFromPaths(paths [][]image.Point, allowDiag bool) []api.Command {
	commands := make([]api.Command, 0)
	var current image.Point
	havePosition := false
	penDown := false

	appendPenUp := func() {
		if len(commands) == 0 || commands[len(commands)-1].Direction != "lift_pen" {
			commands = append(commands, api.Command{Direction: "lift_pen"})
		}
		penDown = false
	}

	appendPenDown := func() {
		if len(commands) == 0 || commands[len(commands)-1].Direction != "lower_pen" {
			commands = append(commands, api.Command{Direction: "lower_pen"})
		}
		penDown = true
	}

	appendSteps := func(direction string, steps int) {
		if steps <= 0 {
			return
		}
		if len(commands) > 0 {
			last := &commands[len(commands)-1]
			if last.Direction == direction && last.Steps > 0 {
				last.Steps += steps
				return
			}
		}
		commands = append(commands, api.Command{Direction: direction, Steps: steps})
	}

	for _, path := range paths {
		if len(path) < 2 {
			continue
		}
		start := path[0]
		if penDown {
			appendPenUp()
		}
		if !havePosition || current != start {
			commands = append(commands, api.Command{
				Direction: "move_to",
				TargetRow: start.Y,
				TargetCol: start.X,
			})
			current = start
			havePosition = true
		}
		appendPenDown()

		for i := 1; i < len(path); i++ {
			next := path[i]
			dx := next.X - current.X
			dy := next.Y - current.Y

			if dx == 0 && dy == 0 {
				continue
			}

			var direction string
			steps := 1

			switch {
			case dx == 1 && dy == 0:
				direction = "right"
			case dx == -1 && dy == 0:
				direction = "left"
			case dx == 0 && dy == 1:
				direction = "down"
			case dx == 0 && dy == -1:
				direction = "up"
			case allowDiag && dx == 1 && dy == 1:
				direction = "diag_down_right"
			case allowDiag && dx == -1 && dy == 1:
				direction = "diag_down_left"
			case allowDiag && dx == -1 && dy == -1:
				direction = "diag_up_left"
			case allowDiag && dx == 1 && dy == -1:
				direction = "diag_up_right"
			default:
				appendPenUp()
				commands = append(commands, api.Command{
					Direction: "move_to",
					TargetRow: next.Y,
					TargetCol: next.X,
				})
				appendPenDown()
				current = next
				continue
			}

			appendSteps(direction, steps)
			current = next
		}

		if penDown {
			appendPenUp()
		}
	}

	return commands
}

func buildInstructions(commands []api.Command) []string {
	if len(commands) == 0 {
		return nil
	}

	instructions := make([]string, 0, len(commands))

	for _, cmd := range commands {
		switch cmd.Direction {
		case "move_to":
			instructions = append(instructions, 
				fmt.Sprintf("Переместитесь в клетку (строка %d, колонка %d)", cmd.TargetRow+1, cmd.TargetCol+1))
		case "lift_pen":
			instructions = append(instructions, "Поднимите карандаш")
		case "lower_pen":
			instructions = append(instructions, "Опустите карандаш")
		default:
			if cmd.Steps > 0 {
				instructions = append(instructions, 
					fmt.Sprintf("Двигайтесь %s на %d", translateDirection(cmd.Direction), cmd.Steps))
			}
		}
	}

	return instructions
}

func translateDirection(dir string) string {
	switch dir {
	case "right":
		return "вправо"
	case "left":
		return "влево"
	case "up":
		return "вверх"
	case "down":
		return "вниз"
	case "diag_down_right":
		return "по диагонали вправо-вниз"
	case "diag_down_left":
		return "по диагонали влево-вниз"
	case "diag_up_left":
		return "по диагонали влево-вверх"
	case "diag_up_right":
		return "по диагонали вправо-вверх"
	default:
		return dir
	}
}

func toCanvasPolyline(path []image.Point, cellSize int) []image.Point {
	points := make([]image.Point, len(path))
	for i, pt := range path {
		points[i] = image.Point{X: pt.X * cellSize, Y: pt.Y * cellSize}
	}
	return points
}

// simplifyContourPath applies Douglas-Peucker algorithm to reduce path complexity
func simplifyContourPath(path []image.Point, epsilon float64) []image.Point {
	if len(path) <= 2 {
		return path
	}

	// Find point with maximum distance from line segment
	maxDist := 0.0
	maxIndex := 0
	start := path[0]
	end := path[len(path)-1]

	for i := 1; i < len(path)-1; i++ {
		dist := perpendicularDistance(path[i], start, end)
		if dist > maxDist {
			maxDist = dist
			maxIndex = i
		}
	}

	// If max distance is greater than epsilon, recursively simplify
	if maxDist > epsilon {
		// Recursive call
		left := simplifyContourPath(path[:maxIndex+1], epsilon)
		right := simplifyContourPath(path[maxIndex:], epsilon)
		
		// Combine results (remove duplicate middle point)
		result := make([]image.Point, 0, len(left)+len(right)-1)
		result = append(result, left...)
		result = append(result, right[1:]...)
		return result
	}

	// If max distance is less than epsilon, return endpoints
	return []image.Point{start, end}
}

func perpendicularDistance(point, lineStart, lineEnd image.Point) float64 {
	dx := float64(lineEnd.X - lineStart.X)
	dy := float64(lineEnd.Y - lineStart.Y)
	
	// Line segment length squared
	lenSq := dx*dx + dy*dy
	if lenSq == 0 {
		// Line start and end are the same point
		px := float64(point.X - lineStart.X)
		py := float64(point.Y - lineStart.Y)
		return math.Sqrt(px*px + py*py)
	}

	// Calculate perpendicular distance
	t := ((float64(point.X-lineStart.X))*dx + (float64(point.Y-lineStart.Y))*dy) / lenSq
	t = math.Max(0, math.Min(1, t))
	
	projX := float64(lineStart.X) + t*dx
	projY := float64(lineStart.Y) + t*dy
	
	distX := float64(point.X) - projX
	distY := float64(point.Y) - projY
	
	return math.Sqrt(distX*distX + distY*distY)
}

// smoothPath applies averaging smoothing to reduce jaggedness
func smoothPath(path []image.Point, iterations int) []image.Point {
	if len(path) < 3 || iterations <= 0 {
		return path
	}
	
	result := make([]image.Point, len(path))
	copy(result, path)
	
	for iter := 0; iter < iterations; iter++ {
		smoothed := make([]image.Point, len(result))
		
		// Keep first and last points fixed
		smoothed[0] = result[0]
		smoothed[len(result)-1] = result[len(result)-1]
		
		// Average each point with its neighbors
		for i := 1; i < len(result)-1; i++ {
			prevX := result[i-1].X
			prevY := result[i-1].Y
			currX := result[i].X
			currY := result[i].Y
			nextX := result[i+1].X
			nextY := result[i+1].Y
			
			// Weighted average: 25% prev + 50% current + 25% next
			smoothed[i] = image.Point{
				X: (prevX + 2*currX + nextX) / 4,
				Y: (prevY + 2*currY + nextY) / 4,
			}
		}
		
		result = smoothed
	}
	
	// Remove consecutive duplicates after smoothing
	deduplicated := []image.Point{result[0]}
	for i := 1; i < len(result); i++ {
		if result[i] != deduplicated[len(deduplicated)-1] {
			deduplicated = append(deduplicated, result[i])
		}
	}
	
	return deduplicated
}

// scaleContourPath scales a path by a factor
func scaleContourPath(path []image.Point, factor float64) []image.Point {
	if factor == 1.0 {
		return path
	}
	
	scaled := make([]image.Point, len(path))
	for i, pt := range path {
		scaled[i] = image.Point{
			X: int(math.Round(float64(pt.X) / factor)),
			Y: int(math.Round(float64(pt.Y) / factor)),
		}
	}
	
	// Remove consecutive duplicates after scaling
	if len(scaled) <= 1 {
		return scaled
	}
	
	deduplicated := []image.Point{scaled[0]}
	for i := 1; i < len(scaled); i++ {
		if scaled[i] != deduplicated[len(deduplicated)-1] {
			deduplicated = append(deduplicated, scaled[i])
		}
	}
	
	return deduplicated
}

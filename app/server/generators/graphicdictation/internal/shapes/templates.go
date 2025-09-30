package shapes

import (
	"image"
	"math/rand"
)

// ShapeTemplate defines a basic shape that can be generated
type ShapeTemplate struct {
	Name       string
	Category   string
	Difficulty string // easy, medium, hard
	MinSteps   int
	MaxSteps   int
	Generator  func(width, height int, rng *rand.Rand) []image.Point
}

// GetTemplates returns all available shape templates
func GetTemplates() []ShapeTemplate {
	return []ShapeTemplate{
		// Easy shapes (10-20 steps)
		{
			Name:       "square",
			Category:   "basic",
			Difficulty: "easy",
			MinSteps:   4,
			MaxSteps:   4,
			Generator:  generateSquare,
		},
		{
			Name:       "rectangle",
			Category:   "basic",
			Difficulty: "easy",
			MinSteps:   4,
			MaxSteps:   4,
			Generator:  generateRectangle,
		},
		{
			Name:       "house",
			Category:   "buildings",
			Difficulty: "easy",
			MinSteps:   7,
			MaxSteps:   12,
			Generator:  generateHouse,
		},
		{
			Name:       "tree",
			Category:   "nature",
			Difficulty: "easy",
			MinSteps:   8,
			MaxSteps:   15,
			Generator:  generateTree,
		},
		// Medium shapes (20-40 steps)
		{
			Name:       "car",
			Category:   "transport",
			Difficulty: "medium",
			MinSteps:   15,
			MaxSteps:   30,
			Generator:  generateCar,
		},
		{
			Name:       "boat",
			Category:   "transport",
			Difficulty: "medium",
			MinSteps:   12,
			MaxSteps:   25,
			Generator:  generateBoat,
		},
		{
			Name:       "robot",
			Category:   "characters",
			Difficulty: "medium",
			MinSteps:   20,
			MaxSteps:   35,
			Generator:  generateRobot,
		},
		{
			Name:       "crane",
			Category:   "transport",
			Difficulty: "medium",
			MinSteps:   20,
			MaxSteps:   35,
			Generator:  generateCrane,
		},
		{
			Name:       "airplane",
			Category:   "transport",
			Difficulty: "medium",
			MinSteps:   20,
			MaxSteps:   35,
			Generator:  generateAirplane,
		},
		{
			Name:       "rocket",
			Category:   "transport",
			Difficulty: "medium",
			MinSteps:   15,
			MaxSteps:   30,
			Generator:  generateRocket,
		},
		{
			Name:       "butterfly",
			Category:   "animals",
			Difficulty: "medium",
			MinSteps:   25,
			MaxSteps:   40,
			Generator:  generateButterfly,
		},
		// Hard shapes (40-70 steps)
		{
			Name:       "dog",
			Category:   "animals",
			Difficulty: "hard",
			MinSteps:   30,
			MaxSteps:   60,
			Generator:  generateDog,
		},
		{
			Name:       "cat",
			Category:   "animals",
			Difficulty: "hard",
			MinSteps:   30,
			MaxSteps:   60,
			Generator:  generateCat,
		},
		{
			Name:       "mixer_truck",
			Category:   "transport",
			Difficulty: "hard",
			MinSteps:   40,
			MaxSteps:   70,
			Generator:  generateMixerTruck,
		},
	}
}

// generateSquare creates a simple square
func generateSquare(width, height int, rng *rand.Rand) []image.Point {
	size := min(width, height) / 2
	if size < 3 {
		size = 3
	}
	
	centerX := width / 2
	centerY := height / 2
	halfSize := size / 2
	
	return []image.Point{
		{X: centerX - halfSize, Y: centerY - halfSize},
		{X: centerX + halfSize, Y: centerY - halfSize},
		{X: centerX + halfSize, Y: centerY + halfSize},
		{X: centerX - halfSize, Y: centerY + halfSize},
		{X: centerX - halfSize, Y: centerY - halfSize},
	}
}

// generateRectangle creates a rectangle
func generateRectangle(width, height int, rng *rand.Rand) []image.Point {
	w := width / 2
	h := height / 3
	if w < 4 {
		w = 4
	}
	if h < 3 {
		h = 3
	}
	
	centerX := width / 2
	centerY := height / 2
	halfW := w / 2
	halfH := h / 2
	
	return []image.Point{
		{X: centerX - halfW, Y: centerY - halfH},
		{X: centerX + halfW, Y: centerY - halfH},
		{X: centerX + halfW, Y: centerY + halfH},
		{X: centerX - halfW, Y: centerY + halfH},
		{X: centerX - halfW, Y: centerY - halfH},
	}
}

// generateHouse creates a simple house (square + triangle roof)
func generateHouse(width, height int, rng *rand.Rand) []image.Point {
	size := min(width, height) / 2
	if size < 5 {
		size = 5
	}
	
	centerX := width / 2
	centerY := height / 2
	halfSize := size / 2
	roofHeight := size / 3
	
	return []image.Point{
		// Start at top of roof
		{X: centerX, Y: centerY - halfSize - roofHeight},
		// Right side of roof
		{X: centerX + halfSize, Y: centerY - halfSize},
		// Right wall
		{X: centerX + halfSize, Y: centerY + halfSize},
		// Bottom right
		{X: centerX - halfSize, Y: centerY + halfSize},
		// Left wall
		{X: centerX - halfSize, Y: centerY - halfSize},
		// Back to top
		{X: centerX, Y: centerY - halfSize - roofHeight},
	}
}

// generateTree creates a simple tree (triangle + rectangle trunk)
func generateTree(width, height int, rng *rand.Rand) []image.Point {
	size := min(width, height) / 2
	if size < 5 {
		size = 5
	}
	
	centerX := width / 2
	centerY := height / 2
	crownSize := size * 2 / 3
	trunkWidth := size / 5
	trunkHeight := size / 3
	
	return []image.Point{
		// Tree crown (triangle)
		{X: centerX, Y: centerY - crownSize},
		{X: centerX + crownSize/2, Y: centerY - trunkHeight},
		{X: centerX + trunkWidth, Y: centerY - trunkHeight},
		// Trunk
		{X: centerX + trunkWidth, Y: centerY + trunkHeight},
		{X: centerX - trunkWidth, Y: centerY + trunkHeight},
		{X: centerX - trunkWidth, Y: centerY - trunkHeight},
		// Back up to crown
		{X: centerX - crownSize/2, Y: centerY - trunkHeight},
		{X: centerX, Y: centerY - crownSize},
	}
}

// generateCar creates a simple car
func generateCar(width, height int, rng *rand.Rand) []image.Point {
	carWidth := width * 2 / 3
	carHeight := height / 3
	if carWidth < 8 {
		carWidth = 8
	}
	if carHeight < 4 {
		carHeight = 4
	}
	
	centerX := width / 2
	centerY := height / 2
	halfW := carWidth / 2
	bodyH := carHeight * 2 / 3
	cabH := carHeight / 3
	
	return []image.Point{
		// Start bottom left
		{X: centerX - halfW, Y: centerY + bodyH},
		// Wheel well
		{X: centerX - halfW/2, Y: centerY + bodyH},
		{X: centerX - halfW/2, Y: centerY + bodyH - 1},
		{X: centerX - halfW/3, Y: centerY + bodyH - 1},
		{X: centerX - halfW/3, Y: centerY + bodyH},
		// Bottom to right
		{X: centerX + halfW/3, Y: centerY + bodyH},
		// Right wheel well
		{X: centerX + halfW/3, Y: centerY + bodyH - 1},
		{X: centerX + halfW/2, Y: centerY + bodyH - 1},
		{X: centerX + halfW/2, Y: centerY + bodyH},
		// Bottom right
		{X: centerX + halfW, Y: centerY + bodyH},
		// Right side
		{X: centerX + halfW, Y: centerY},
		// Cabin
		{X: centerX + halfW/3, Y: centerY},
		{X: centerX + halfW/3, Y: centerY - cabH},
		{X: centerX - halfW/3, Y: centerY - cabH},
		{X: centerX - halfW/3, Y: centerY},
		// Left side
		{X: centerX - halfW, Y: centerY},
		{X: centerX - halfW, Y: centerY + bodyH},
	}
}

// generateBoat creates a simple boat
func generateBoat(width, height int, rng *rand.Rand) []image.Point {
	boatWidth := width * 2 / 3
	boatHeight := height / 2
	
	centerX := width / 2
	centerY := height / 2
	halfW := boatWidth / 2
	
	return []image.Point{
		// Mast
		{X: centerX, Y: centerY - boatHeight},
		{X: centerX, Y: centerY},
		// Hull - right side
		{X: centerX + halfW, Y: centerY},
		{X: centerX + halfW - 2, Y: centerY + boatHeight/2},
		// Bottom
		{X: centerX, Y: centerY + boatHeight/2 + 1},
		// Hull - left side
		{X: centerX - halfW + 2, Y: centerY + boatHeight/2},
		{X: centerX - halfW, Y: centerY},
		// Back to mast
		{X: centerX, Y: centerY},
	}
}

// generateRobot creates a simple robot
func generateRobot(width, height int, rng *rand.Rand) []image.Point {
	size := min(width, height) / 2
	if size < 6 {
		size = 6
	}
	
	centerX := width / 2
	centerY := height / 2
	
	headSize := size / 3
	bodyW := size * 2 / 3
	bodyH := size / 2
	armW := size / 6
	legW := size / 6
	
	points := []image.Point{
		// Head
		{X: centerX - headSize, Y: centerY - bodyH - headSize},
		{X: centerX + headSize, Y: centerY - bodyH - headSize},
		{X: centerX + headSize, Y: centerY - bodyH},
		// Right arm
		{X: centerX + bodyW, Y: centerY - bodyH},
		{X: centerX + bodyW, Y: centerY - bodyH + armW*2},
		{X: centerX + bodyW - armW, Y: centerY - bodyH + armW*2},
		{X: centerX + bodyW - armW, Y: centerY},
		// Body right
		{X: centerX + bodyW/2, Y: centerY},
		// Right leg
		{X: centerX + bodyW/2, Y: centerY + bodyH},
		{X: centerX + legW, Y: centerY + bodyH},
		{X: centerX + legW, Y: centerY},
		// Body bottom
		{X: centerX - legW, Y: centerY},
		// Left leg
		{X: centerX - legW, Y: centerY + bodyH},
		{X: centerX - bodyW/2, Y: centerY + bodyH},
		{X: centerX - bodyW/2, Y: centerY},
		// Body left
		{X: centerX - bodyW + armW, Y: centerY},
		// Left arm
		{X: centerX - bodyW + armW, Y: centerY - bodyH + armW*2},
		{X: centerX - bodyW, Y: centerY - bodyH + armW*2},
		{X: centerX - bodyW, Y: centerY - bodyH},
		// Back to head
		{X: centerX - headSize, Y: centerY - bodyH},
		{X: centerX - headSize, Y: centerY - bodyH - headSize},
	}
	
	return points
}

// generateDog creates a simple dog silhouette
func generateDog(width, height int, rng *rand.Rand) []image.Point {
	size := min(width, height) / 2
	if size < 8 {
		size = 8
	}
	
	centerX := width / 2
	centerY := height / 2
	
	// Simplified dog profile
	bodyW := size
	bodyH := size / 3
	legH := size / 3
	headSize := size / 3
	
	return []image.Point{
		// Back leg
		{X: centerX - bodyW/3, Y: centerY + bodyH + legH},
		{X: centerX - bodyW/3, Y: centerY + bodyH},
		// Back
		{X: centerX - bodyW/2, Y: centerY},
		// Tail
		{X: centerX - bodyW/2 - 2, Y: centerY - 2},
		{X: centerX - bodyW/2, Y: centerY},
		// Top line
		{X: centerX + bodyW/3, Y: centerY},
		// Head
		{X: centerX + bodyW/2, Y: centerY - headSize/2},
		{X: centerX + bodyW/2 + 2, Y: centerY - headSize},
		{X: centerX + bodyW/2 + 3, Y: centerY - headSize + 1},
		{X: centerX + bodyW/2 + 2, Y: centerY},
		// Neck
		{X: centerX + bodyW/3, Y: centerY + bodyH/2},
		// Front leg
		{X: centerX + bodyW/4, Y: centerY + bodyH/2},
		{X: centerX + bodyW/4, Y: centerY + bodyH + legH},
		{X: centerX + bodyW/6, Y: centerY + bodyH + legH},
		{X: centerX + bodyW/6, Y: centerY + bodyH},
		// Belly
		{X: centerX - bodyW/4, Y: centerY + bodyH},
		// Back to back leg
		{X: centerX - bodyW/3, Y: centerY + bodyH + legH},
	}
}

// generateCat creates a simple cat silhouette
func generateCat(width, height int, rng *rand.Rand) []image.Point {
	size := min(width, height) / 2
	if size < 8 {
		size = 8
	}
	
	centerX := width / 2
	centerY := height / 2
	
	bodyW := size
	bodyH := size / 3
	legH := size / 4
	headSize := size / 3
	
	return []image.Point{
		// Back leg
		{X: centerX - bodyW/3, Y: centerY + bodyH + legH},
		{X: centerX - bodyW/3, Y: centerY + bodyH},
		// Back
		{X: centerX - bodyW/2, Y: centerY + bodyH/2},
		{X: centerX - bodyW/2, Y: centerY},
		// Tail up
		{X: centerX - bodyW/2 - 1, Y: centerY - bodyH},
		{X: centerX - bodyW/2, Y: centerY},
		// Back line
		{X: centerX + bodyW/4, Y: centerY - bodyH/3},
		// Head
		{X: centerX + bodyW/3, Y: centerY - bodyH/2},
		// Ear
		{X: centerX + bodyW/3 + 2, Y: centerY - headSize},
		{X: centerX + bodyW/3 + 3, Y: centerY - bodyH/2},
		// Face
		{X: centerX + bodyW/2 + 2, Y: centerY},
		// Neck
		{X: centerX + bodyW/3, Y: centerY + bodyH/3},
		// Front leg
		{X: centerX + bodyW/4, Y: centerY + bodyH/3},
		{X: centerX + bodyW/4, Y: centerY + bodyH + legH},
		{X: centerX + bodyW/6, Y: centerY + bodyH + legH},
		{X: centerX + bodyW/6, Y: centerY + bodyH},
		// Belly
		{X: centerX - bodyW/4, Y: centerY + bodyH},
		{X: centerX - bodyW/3, Y: centerY + bodyH + legH},
	}
}

// generateCrane creates a construction crane
func generateCrane(width, height int, rng *rand.Rand) []image.Point {
	size := min(width, height) / 2
	if size < 8 {
		size = 8
	}
	
	centerX := width / 2
	centerY := height / 2
	
	// Crane components
	boomLength := size         // Длина стрелы
	cabinW := size / 3         // Ширина кабины
	cabinH := size / 4         // Высота кабины
	counterW := size / 4       // Противовес
	
	return []image.Point{
		// Start at counterweight
		{X: centerX - cabinW - counterW, Y: centerY + cabinH/2},
		{X: centerX - cabinW - counterW, Y: centerY},
		{X: centerX - cabinW, Y: centerY},
		// Cabin
		{X: centerX - cabinW, Y: centerY - cabinH},
		{X: centerX + cabinW/2, Y: centerY - cabinH},
		{X: centerX + cabinW/2, Y: centerY},
		// Boom (diagonal up)
		{X: centerX, Y: centerY - cabinH},
		{X: centerX + boomLength/2, Y: centerY - boomLength},
		// Hook line
		{X: centerX + boomLength/2, Y: centerY - boomLength + boomLength/3},
		{X: centerX + boomLength/2, Y: centerY - boomLength},
		// Back to cabin
		{X: centerX, Y: centerY - cabinH},
		{X: centerX, Y: centerY},
		// Base
		{X: centerX - cabinW, Y: centerY},
		{X: centerX - cabinW, Y: centerY + cabinH/2},
		// Tracks
		{X: centerX + cabinW/2, Y: centerY + cabinH/2},
		{X: centerX + cabinW/2, Y: centerY},
		{X: centerX, Y: centerY},
		// Back to start
		{X: centerX - cabinW - counterW, Y: centerY + cabinH/2},
	}
}

// generateAirplane creates a simple airplane
func generateAirplane(width, height int, rng *rand.Rand) []image.Point {
	size := min(width, height) / 2
	if size < 8 {
		size = 8
	}
	
	centerX := width / 2
	centerY := height / 2
	
	bodyW := size
	bodyH := size / 4
	wingW := size * 2 / 3
	tailW := size / 3
	
	return []image.Point{
		// Nose
		{X: centerX + bodyW/2, Y: centerY},
		// Top body line
		{X: centerX + bodyW/4, Y: centerY - bodyH/2},
		{X: centerX - bodyW/3, Y: centerY - bodyH/2},
		// Top wing
		{X: centerX - bodyW/4, Y: centerY - wingW/2},
		{X: centerX - bodyW/3, Y: centerY - wingW/2},
		{X: centerX - bodyW/3, Y: centerY - bodyH/2},
		// Tail
		{X: centerX - bodyW/2, Y: centerY - bodyH/2},
		{X: centerX - bodyW/2 - tailW/2, Y: centerY - tailW},
		{X: centerX - bodyW/2, Y: centerY - bodyH/2},
		// Bottom line
		{X: centerX - bodyW/2, Y: centerY + bodyH/2},
		// Bottom wing
		{X: centerX - bodyW/3, Y: centerY + bodyH/2},
		{X: centerX - bodyW/3, Y: centerY + wingW/2},
		{X: centerX - bodyW/4, Y: centerY + wingW/2},
		{X: centerX - bodyW/4, Y: centerY + bodyH/2},
		// Back to nose
		{X: centerX + bodyW/2, Y: centerY},
	}
}

// generateRocket creates a simple rocket
func generateRocket(width, height int, rng *rand.Rand) []image.Point {
	size := min(width, height) / 2
	if size < 6 {
		size = 6
	}
	
	centerX := width / 2
	centerY := height / 2
	
	bodyW := size / 2
	bodyH := size
	noseH := size / 3
	finW := size / 4
	
	return []image.Point{
		// Nose tip
		{X: centerX, Y: centerY - bodyH/2 - noseH},
		// Right nose
		{X: centerX + bodyW/2, Y: centerY - bodyH/2},
		// Right fin
		{X: centerX + bodyW/2 + finW, Y: centerY + bodyH/2},
		{X: centerX + bodyW/2, Y: centerY + bodyH/2},
		// Bottom right
		{X: centerX + bodyW/3, Y: centerY + bodyH/2 + finW/2},
		// Exhaust center
		{X: centerX, Y: centerY + bodyH/2},
		// Bottom left
		{X: centerX - bodyW/3, Y: centerY + bodyH/2 + finW/2},
		// Left body
		{X: centerX - bodyW/2, Y: centerY + bodyH/2},
		// Left fin
		{X: centerX - bodyW/2 - finW, Y: centerY + bodyH/2},
		{X: centerX - bodyW/2, Y: centerY - bodyH/2},
		// Back to nose
		{X: centerX, Y: centerY - bodyH/2 - noseH},
	}
}

// generateButterfly creates a simple butterfly
func generateButterfly(width, height int, rng *rand.Rand) []image.Point {
	size := min(width, height) / 2
	if size < 8 {
		size = 8
	}
	
	centerX := width / 2
	centerY := height / 2
	
	bodyH := size
	wingW := size / 2
	wingH := size * 2 / 3
	
	return []image.Point{
		// Right top wing
		{X: centerX, Y: centerY - bodyH/3},
		{X: centerX + wingW, Y: centerY - bodyH/2 - wingH/2},
		{X: centerX + wingW/2, Y: centerY - bodyH/3},
		{X: centerX, Y: centerY - bodyH/3},
		// Body top
		{X: centerX, Y: centerY - bodyH/2},
		// Left top wing
		{X: centerX, Y: centerY - bodyH/3},
		{X: centerX - wingW/2, Y: centerY - bodyH/3},
		{X: centerX - wingW, Y: centerY - bodyH/2 - wingH/2},
		{X: centerX, Y: centerY - bodyH/3},
		// Body middle
		{X: centerX, Y: centerY},
		// Right bottom wing
		{X: centerX + wingW/2, Y: centerY + bodyH/3},
		{X: centerX + wingW, Y: centerY + bodyH/2 + wingH/2},
		{X: centerX, Y: centerY + bodyH/3},
		// Body bottom
		{X: centerX, Y: centerY + bodyH/2},
		// Left bottom wing
		{X: centerX, Y: centerY + bodyH/3},
		{X: centerX - wingW, Y: centerY + bodyH/2 + wingH/2},
		{X: centerX - wingW/2, Y: centerY + bodyH/3},
		{X: centerX, Y: centerY},
	}
}

// generateMixerTruck creates a concrete mixer truck
func generateMixerTruck(width, height int, rng *rand.Rand) []image.Point {
	size := min(width, height) / 2
	if size < 10 {
		size = 10
	}
	
	centerX := width / 2
	centerY := height / 2
	
	truckW := size
	cabW := size / 3
	cabH := size / 3
	drumW := size / 2
	drumH := size / 2
	
	return []image.Point{
		// Cab front bottom
		{X: centerX - truckW/2, Y: centerY + cabH},
		// Front wheel
		{X: centerX - truckW/2 + 2, Y: centerY + cabH},
		{X: centerX - truckW/2 + 2, Y: centerY + cabH - 1},
		{X: centerX - truckW/2 + 4, Y: centerY + cabH - 1},
		{X: centerX - truckW/2 + 4, Y: centerY + cabH},
		// Cab bottom to drum
		{X: centerX - truckW/2 + cabW, Y: centerY + cabH},
		// Drum bottom right
		{X: centerX + drumW/2, Y: centerY + drumH/3},
		// Rear wheel
		{X: centerX + drumW/2 - 2, Y: centerY + drumH/3},
		{X: centerX + drumW/2 - 2, Y: centerY + drumH/3 - 1},
		{X: centerX + drumW/2 - 4, Y: centerY + drumH/3 - 1},
		{X: centerX + drumW/2 - 4, Y: centerY + drumH/3},
		// Drum right
		{X: centerX + drumW/3, Y: centerY},
		{X: centerX + drumW/2, Y: centerY - drumH/3},
		// Drum top
		{X: centerX, Y: centerY - drumH/2},
		// Drum left
		{X: centerX - drumW/2, Y: centerY - drumH/3},
		{X: centerX - drumW/3, Y: centerY},
		// Drum bottom left
		{X: centerX - drumW/2, Y: centerY + drumH/4},
		// Connect to cab
		{X: centerX - truckW/2 + cabW, Y: centerY + drumH/4},
		// Cab top
		{X: centerX - truckW/2 + cabW, Y: centerY},
		{X: centerX - truckW/2 + cabW/2, Y: centerY - cabH/2},
		{X: centerX - truckW/2 + 2, Y: centerY - cabH/2},
		// Cab front
		{X: centerX - truckW/2, Y: centerY},
		{X: centerX - truckW/2, Y: centerY + cabH},
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

package generator

import (
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"math"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/disintegration/imaging"
	gojson "github.com/goccy/go-json"

	"neirogen/app/server/generators/graphicdictation/internal/api"
)

var ErrUnsupportedImage = errors.New("unsupported image")

// Generate performs graphic dictation generation:
//  1. loads and normalizes input image
//  2. traces a path on grid
//  3. splits commands by shard
//  4. renders preview once (shard 0)
func Generate(req api.GenerateRequest) (api.GenerateResponse, error) {
	img, err := loadImage(req.SourceImage)
	if err != nil {
		return api.GenerateResponse{}, err
	}

	margin := computeMargin(req.GridWidth, req.GridHeight)
	targetH := max(1, req.GridHeight-2*margin)

	normalized := imaging.Fit(img, targetW, targetH, imaging.Lanczos)
	mask := thresholdWithMargin(normalized, req.GridWidth, req.GridHeight, margin)
	path := tracePath(mask, req.AllowDiagonals)
	if len(path) == 0 {
		return api.GenerateResponse{}, errors.New("unable to build path for dictation")
	}

	commands := simplifyPath(path)

	chunkSize := int(math.Ceil(float64(len(commands)) / float64(max(req.ShardTotal, 1))))
{{ ... }}
		}
		resp.PreviewImageURL = pngPath
		resp.PreviewSvgURL = svgPath
	}

	return resp, nil
}

func loadImage(path string) (image.Image, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open image: %w", err)
	}
	defer file.Close()

	img, _, err := image.Decode(file)
	if err != nil {
		return nil, fmt.Errorf("decode image: %w", err)
	}
	return img, nil
}

func thresholdWithMargin(img image.Image, width, height, margin int) [][]bool {
	if width <= 0 {
		width = 1
	}
	if height <= 0 {
		height = 1
	}

	mask := make([][]bool, height)
	for y := 0; y < height; y++ {
		mask[y] = make([]bool, width)
	}

	bounds := img.Bounds()
	imgW := bounds.Dx()
	imgH := bounds.Dy()

	availableW := width - 2*margin
	if availableW < imgW {
		availableW = imgW
	}
	availableH := height - 2*margin
	if availableH < imgH {
		availableH = imgH
	}

	offsetX := margin
	if availableW > imgW {
		offsetX += (availableW - imgW) / 2
	}
	offsetY := margin
	if availableH > imgH {
		offsetY += (availableH - imgH) / 2
	}

	for y := 0; y < imgH; y++ {
		for x := 0; x < imgW; x++ {
			r, g, b, _ := img.At(bounds.Min.X+x, bounds.Min.Y+y).RGBA()
			gray := 0.2126*float64(r)/65535 + 0.7152*float64(g)/65535 + 0.0722*float64(b)/65535
			maskY := offsetY + y
			maskX := offsetX + x
			if maskY >= 0 && maskY < height && maskX >= 0 && maskX < width {
				mask[maskY][maskX] = gray < 0.5
			}
		}
	}

	return mask
}

func computeMargin(width, height int) int {
	minSide := min(width, height)
	margin := minSide / 8
	if margin < 1 {
		margin = 1
	}
	maxMargin := (minSide - 2) / 2
	if maxMargin < 1 {
		maxMargin = 1
	}
	if margin > maxMargin {
		margin = maxMargin
	}
	return margin
}

func tracePath(mask [][]bool, allowDiag bool) []image.Point {
	var path []image.Point
	visited := make(map[image.Point]bool)

	h := len(mask)
	if h == 0 {
		return path
	}
	w := len(mask[0])

	dirs := []image.Point{{1, 0}, {0, 1}, {-1, 0}, {0, -1}}
	if allowDiag {
		dirs = append(dirs, image.Point{1, 1}, image.Point{-1, 1}, image.Point{-1, -1}, image.Point{1, -1})
	}

	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			if !mask[y][x] {
				continue
			}
			pt := image.Point{X: x, Y: y}
			if visited[pt] {
				continue
			}
			stack := []image.Point{pt}
			for len(stack) > 0 {
				n := len(stack) - 1
				cur := stack[n]
				stack = stack[:n]
				if visited[cur] {
					continue
				}
				visited[cur] = true
				path = append(path, cur)
				for _, d := range dirs {
					next := image.Point{cur.X + d.X, cur.Y + d.Y}
					if next.X < 0 || next.Y < 0 || next.X >= w || next.Y >= h {
						continue
					}
					if !mask[next.Y][next.X] || visited[next] {
						continue
					}
					stack = append(stack, next)
				}
			}
		}
	}

	return path
}

func simplifyPath(path []image.Point) []api.Command {
	if len(path) == 0 {
		return nil
	}

	directions := func(a, b image.Point) string {
		dx := b.X - a.X
		dy := b.Y - a.Y
		switch {
		case dx == 1 && dy == 0:
			return "right"
		case dx == -1 && dy == 0:
			return "left"
		case dx == 0 && dy == 1:
			return "down"
		case dx == 0 && dy == -1:
			return "up"
		case dx == 1 && dy == 1:
			return "diag_down_right"
		case dx == -1 && dy == 1:
			return "diag_down_left"
		case dx == -1 && dy == -1:
			return "diag_up_left"
		case dx == 1 && dy == -1:
			return "diag_up_right"
		default:
			return "move"
		}
	}

	commands := make([]api.Command, 0)
	current := path[0]
	var cmd api.Command

	for i := 1; i < len(path); i++ {
		direction := directions(current, path[i])
		if cmd.Direction == "" {
			cmd.Direction = direction
			cmd.Steps = 1
		} else if cmd.Direction == direction {
			cmd.Steps++
		} else {
			commands = append(commands, cmd)
			cmd = api.Command{Direction: direction, Steps: 1}
		}
		current = path[i]
	}

	if cmd.Direction != "" {
		commands = append(commands, cmd)
	}

	return commands
}

	// Render PNG and SVG previews for shard 0.
	if req.ShardIndex == 0 {
		pngPath, svgPath, perr := renderPreviews(req, commands)
		if perr != nil {
			return api.GenerateResponse{}, fmt.Errorf("preview render: %w", perr)
		}
		resp.PreviewImageURL = pngPath
		resp.PreviewSvgURL = svgPath
	if err != nil {
{{ ... }}
	}
	defer file.Close()

	width := req.GridWidth * req.CellSizeMM
	height := req.GridHeight * req.CellSizeMM

	_, _ = fmt.Fprintf(file, "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"%d\" height=\"%d\" viewBox=\"0 0 %d %d\">\n", width, height, width, height)
	_, _ = fmt.Fprintf(file, "<rect width=\"100%%\" height=\"100%%\" fill=\"white\"/>\n")

	if len(points) > 1 {
		_, _ = fmt.Fprintf(file, "<polyline fill=\"none\" stroke=\"black\" stroke-width=\"2\" points=\"")
		for i, pt := range points {
			if i > 0 {
				_, _ = file.WriteString(" ")
			}
			_, _ = fmt.Fprintf(file, "%d,%d", pt.X, pt.Y)
		}
		_, _ = file.WriteString("\"/>\n")
	}

	_, _ = file.WriteString("</svg>")
	return nil
}

func drawLine(img *image.RGBA, from, to image.Point, col color.Color) {
	dx := float64(to.X - from.X)
	dy := float64(to.Y - from.Y)
	steps := int(math.Max(math.Abs(dx), math.Abs(dy)))
	if steps == 0 {
		img.Set(from.X, from.Y, col)
		return
	}

	xInc := dx / float64(steps)
	yInc := dy / float64(steps)
	x := float64(from.X)
	y := float64(from.Y)

	for i := 0; i <= steps; i++ {
		img.Set(int(math.Round(x)), int(math.Round(y)), col)
		x += xInc
		y += yInc
	}
}

func directionToPoint(dir string) image.Point {
	switch dir {
	case "right":
		return image.Point{1, 0}
	case "left":
		return image.Point{-1, 0}
	case "down":
		return image.Point{0, 1}
	case "up":
		return image.Point{0, -1}
	case "diag_down_right":
		return image.Point{1, 1}
	case "diag_down_left":
		return image.Point{-1, 1}
	case "diag_up_left":
		return image.Point{-1, -1}
	case "diag_up_right":
		return image.Point{1, -1}
	default:
		return image.Point{0, 0}
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func MarshalCommands(commands []api.Command) (string, error) {
	dat, err := gojson.Marshal(commands)
	if err != nil {
		return "", err
	}
	return string(dat), nil
}

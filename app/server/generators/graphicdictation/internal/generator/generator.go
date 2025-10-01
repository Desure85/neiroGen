package generator

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"path/filepath"
	"strings"
	"time"

	"github.com/disintegration/imaging"
	"github.com/minio/minio-go/v7"
	"github.com/neirogen/graphicdictation/internal/api"
	"github.com/neirogen/graphicdictation/internal/shapes"
)

// Service отвечает за генерацию графических диктантов.
type Service struct {
	matcher *shapes.Matcher
}

// NewService создаёт службу с ленивой инициализацией шаблонов.
func NewService() (*Service, error) {
	matcher, err := shapes.DefaultMatcher()
	if err != nil {
		return nil, err
	}
	return &Service{matcher: matcher}, nil
}

// ValidateRequest валидирует входной запрос.
func ValidateRequest(req api.GenerateRequest) error {
	if strings.TrimSpace(req.JobID) == "" {
		return fmt.Errorf("job_id is required")
	}
	if req.GridWidth < 4 || req.GridHeight < 4 {
		return fmt.Errorf("grid dimensions must be at least 4x4")
	}
	if req.GridWidth > 128 || req.GridHeight > 128 {
		return fmt.Errorf("grid dimensions must not exceed 128")
	}
	if req.CellSizeMM <= 0 {
		return fmt.Errorf("cell_size_mm must be positive")
	}
	if req.ShardTotal <= 0 {
		req.ShardTotal = 1
	}
	if req.ShardIndex < 0 || req.ShardIndex >= req.ShardTotal {
		return fmt.Errorf("invalid shard index")
	}
	if strings.TrimSpace(req.ShapeName) == "" && strings.TrimSpace(req.SourceImage) == "" && strings.TrimSpace(req.Description) == "" {
		return fmt.Errorf("either shape_name, description or source_image must be provided")
	}
	return nil
}

// Generate выполняет полную генерацию графического диктанта.
func (s *Service) Generate(ctx context.Context, req api.GenerateRequest) (*api.GenerateResponse, error) {
	if err := ValidateRequest(req); err != nil {
		return nil, err
	}

	paths, tmpl, err := s.buildPaths(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("build paths: %w", err)
	}

	cmds, err := buildCommandsFromPaths(paths, req.AllowDiagonals)
	if err != nil {
		return nil, fmt.Errorf("build commands: %w", err)
	}

	instructions := buildInstructions(cmds)
	startRow, startCol, err := firstPoint(paths)
	if err != nil {
		return nil, fmt.Errorf("start point: %w", err)
	}

	preview := previewMetadata{
		JobID:      req.JobID,
		Template:   tmpl,
		Commands:   cmds,
		Paths:      paths,
		GridWidth:  req.GridWidth,
		GridHeight: req.GridHeight,
		CellSizeMM: req.CellSizeMM,
		StartRow:   startRow,
		StartCol:   startCol,
	}

	previewURLs, err := s.renderAndUploadPreview(ctx, preview)
	if err != nil {
		return nil, err
	}

	return &api.GenerateResponse{
		JobID:           req.JobID,
		ShardIndex:      req.ShardIndex,
		ShardTotal:      req.ShardTotal,
		StartRow:        startRow,
		StartCol:        startCol,
		Commands:        cmds,
		Instructions:    instructions,
		PreviewImageURL: previewURLs.Image,
		PreviewSVGURL:   previewURLs.SVG,
	}, nil
}

func (s *Service) buildPaths(ctx context.Context, req api.GenerateRequest) ([][]image.Point, *shapes.ShapeTemplate, error) {
	if strings.TrimSpace(req.SourceImage) != "" {
		paths, err := generateContoursFromImage(ctx, req)
		return paths, nil, err
	}
	tmpl, err := selectTemplate(s.matcher, req)
	if err != nil {
		return nil, nil, err
	}
	paths, err := generateTemplatePaths(req, tmpl)
	return paths, tmpl, err
}

type previewMetadata struct {
	JobID      string
	Template   *shapes.ShapeTemplate
	Commands   []api.Command
	Paths      [][]image.Point
	GridWidth  int
	GridHeight int
	CellSizeMM int
	StartRow   int
	StartCol   int
}

type previewURLs struct {
	Image string
	SVG   string
}

func (s *Service) renderAndUploadPreview(ctx context.Context, meta previewMetadata) (previewURLs, error) {
	client, presign, bucket, prefix, ttl, err := getMinio()
	if err != nil {
		return previewURLs{}, fmt.Errorf("minio init: %w", err)
	}

	svgData, err := renderSVG(meta)
	if err != nil {
		return previewURLs{}, fmt.Errorf("render svg: %w", err)
	}
	pngData, err := renderPNG(meta)
	if err != nil {
		return previewURLs{}, fmt.Errorf("render png: %w", err)
	}

	baseName := sanitize(meta.JobID)
	if meta.Template != nil {
		baseName = fmt.Sprintf("%s-%s", baseName, sanitize(meta.Template.Name))
	}
	timestamp := time.Now().UTC().Format("20060102T150405Z")
	objectBase := filepath.Join(prefix, baseName+"-"+timestamp)

	svgObject := objectBase + ".svg"
	pngObject := objectBase + ".png"

	if err := uploadBuffer(ctx, client, bucket, svgObject, svgData, "image/svg+xml"); err != nil {
		return previewURLs{}, fmt.Errorf("upload svg: %w", err)
	}
	if err := uploadBuffer(ctx, client, bucket, pngObject, pngData, "image/png"); err != nil {
		return previewURLs{}, fmt.Errorf("upload png: %w", err)
	}

	svgURL, err := presign.PresignedGetObject(ctx, bucket, svgObject, ttl, nil)
	if err != nil {
		return previewURLs{}, fmt.Errorf("presign svg: %w", err)
	}
	pngURL, err := presign.PresignedGetObject(ctx, bucket, pngObject, ttl, nil)
	if err != nil {
		return previewURLs{}, fmt.Errorf("presign png: %w", err)
	}

	applyPublicEndpoint(svgURL)
	applyPublicEndpoint(pngURL)

	return previewURLs{Image: pngURL.String(), SVG: svgURL.String()}, nil
}

func uploadBuffer(ctx context.Context, client *minio.Client, bucket, object string, data []byte, contentType string) error {
	reader := bytes.NewReader(data)
	_, err := client.PutObject(ctx, bucket, object, reader, int64(len(data)), minio.PutObjectOptions{ContentType: contentType})
	return err
}

func renderSVG(meta previewMetadata) ([]byte, error) {
	if meta.CellSizeMM <= 0 {
		return nil, errors.New("cell size must be positive")
	}
	width := (meta.GridWidth-1)*meta.CellSizeMM + 1
	height := (meta.GridHeight-1)*meta.CellSizeMM + 1

	var builder strings.Builder
	builder.Grow(width * height)

	builder.WriteString("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
	builder.WriteString(fmt.Sprintf("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"%dmm\" height=\"%dmm\" viewBox=\"0 0 %d %d\">\n", width, height, width, height))
	builder.WriteString("<rect width=\"100%\" height=\"100%\" fill=\"#ffffff\"/>\n")

	gridColor := "#cccccc"
	for x := 0; x < meta.GridWidth; x++ {
		pos := x * meta.CellSizeMM
		builder.WriteString(fmt.Sprintf("<line x1=\"%d\" y1=\"0\" x2=\"%d\" y2=\"%d\" stroke=\"%s\" stroke-width=\"1\"/>\n", pos, pos, height-1, gridColor))
	}
	borderX := (meta.GridWidth - 1) * meta.CellSizeMM
	builder.WriteString(fmt.Sprintf("<line x1=\"%d\" y1=\"0\" x2=\"%d\" y2=\"%d\" stroke=\"%s\" stroke-width=\"1\"/>\n", borderX, borderX, height-1, gridColor))

	for y := 0; y < meta.GridHeight; y++ {
		pos := y * meta.CellSizeMM
		builder.WriteString(fmt.Sprintf("<line x1=\"0\" y1=\"%d\" x2=\"%d\" y2=\"%d\" stroke=\"%s\" stroke-width=\"1\"/>\n", pos, width-1, pos, gridColor))
	}
	borderY := (meta.GridHeight - 1) * meta.CellSizeMM
	builder.WriteString(fmt.Sprintf("<line x1=\"0\" y1=\"%d\" x2=\"%d\" y2=\"%d\" stroke=\"%s\" stroke-width=\"1\"/>\n", borderY, width-1, borderY, gridColor))

	pathColor := "#000000"
	for _, path := range meta.Paths {
		if len(path) == 0 {
			continue
		}
		builder.WriteString("<polyline fill=\"none\" stroke=\"")
		builder.WriteString(pathColor)
		builder.WriteString("\" stroke-width=\"2\" points=\"")
		for idx, pt := range path {
			x := pt.X * meta.CellSizeMM
			y := pt.Y * meta.CellSizeMM
			if idx > 0 {
				builder.WriteByte(' ')
			}
			builder.WriteString(fmt.Sprintf("%d,%d", x, y))
		}
		builder.WriteString("\"/>\n")
	}

	builder.WriteString(fmt.Sprintf("<circle cx=\"%d\" cy=\"%d\" r=\"4\" fill=\"#ff0000\"/>\n", meta.StartCol*meta.CellSizeMM, meta.StartRow*meta.CellSizeMM))
	builder.WriteString("</svg>")
	return []byte(builder.String()), nil
}

func renderPNG(meta previewMetadata) ([]byte, error) {
	if meta.CellSizeMM <= 0 {
		return nil, errors.New("cell size must be positive")
	}
	width := (meta.GridWidth-1)*meta.CellSizeMM + 1
	height := (meta.GridHeight-1)*meta.CellSizeMM + 1

	img := image.NewRGBA(image.Rect(0, 0, width, height))
	draw.Draw(img, img.Bounds(), &image.Uniform{color.White}, image.Point{}, draw.Src)

	gridColor := color.RGBA{200, 200, 200, 255}
	for x := 0; x < meta.GridWidth; x++ {
		pos := x * meta.CellSizeMM
		for y := 0; y < height; y++ {
			img.Set(pos, y, gridColor)
		}
	}
	for y := 0; y < meta.GridHeight; y++ {
		pos := y * meta.CellSizeMM
		for x := 0; x < width; x++ {
			img.Set(x, pos, gridColor)
		}
	}

	pathColor := color.RGBA{0, 0, 0, 255}
	for _, path := range meta.Paths {
		for i := 1; i < len(path); i++ {
			drawSegment(img, path[i-1], path[i], meta.CellSizeMM, pathColor)
		}
	}

	startColor := color.RGBA{255, 0, 0, 255}
	drawMarker(img, meta.StartCol*meta.CellSizeMM, meta.StartRow*meta.CellSizeMM, startColor)

	buf := bytes.NewBuffer(nil)
	if err := imaging.Encode(buf, img, imaging.PNG); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func drawSegment(img *image.RGBA, a, b image.Point, cellSize int, stroke color.Color) {
	ax := a.X * cellSize
	ay := a.Y * cellSize
	bx := b.X * cellSize
	by := b.Y * cellSize

	abs := func(v int) int {
		if v < 0 {
			return -v
		}
		return v
	}

	dx := abs(bx - ax)
	dy := -abs(by - ay)
	si := 1
	if ax > bx {
		si = -1
	}
	sj := 1
	if ay > by {
		sj = -1
	}
	err := dx + dy
	x := ax
	y := ay

	for {
		img.Set(x, y, stroke)
		if x == bx && y == by {
			break
		}
		e2 := 2 * err
		if e2 >= dy {
			err += dy
			x += si
		}
		if e2 <= dx {
			err += dx
			y += sj
		}
	}
}

func drawMarker(img *image.RGBA, cx, cy int, stroke color.Color) {
	radius := 3
	for dx := -radius; dx <= radius; dx++ {
		for dy := -radius; dy <= radius; dy++ {
			x := cx + dx
			y := cy + dy
			if x < 0 || y < 0 || x >= img.Bounds().Dx() || y >= img.Bounds().Dy() {
				continue
			}
			if dx*dx+dy*dy <= radius*radius {
				img.Set(x, y, stroke)
			}
		}
	}
}

package generator

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"image"
	"math"
	"math/rand"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/neirogen/graphicdictation/internal/api"
	"github.com/neirogen/graphicdictation/internal/shapes"
	gocv "gocv.io/x/gocv"
)

const (
	defaultImageThreshold      = 0.5
	defaultSimplification      = 1.5
	maxSmoothingWindowSize     = 9
	defaultMinContourAreaRatio = 0.02
	defaultMaxDetectedContours = 8
	defaultHighResGrid         = 256
)

var errEmptyPath = errors.New("empty path data")

// generateContoursFromImage извлекает контуры из изображения и нормализует их под сетку генератора.
func generateContoursFromImage(ctx context.Context, req api.GenerateRequest) ([][]image.Point, error) {
	data, err := loadImage(ctx, req.SourceImage)
	if err != nil {
		return nil, fmt.Errorf("load image: %w", err)
	}

	img, err := gocv.IMDecode(data, gocv.IMReadColor)
	if err != nil {
		return nil, fmt.Errorf("decode image: %w", err)
	}
	defer img.Close()
	if img.Empty() {
		return nil, errors.New("decoded image is empty")
	}

	gray := gocv.NewMat()
	defer gray.Close()
	gocv.CvtColor(img, &gray, gocv.ColorBGRToGray)

	processed := gray.Clone()
	defer processed.Close()

	if req.ImageBlurRadius > 0 {
		kernel := kernelSizeFromRadius(req.ImageBlurRadius)
		blurred := gocv.NewMat()
		defer blurred.Close()
		gocv.GaussianBlur(processed, &blurred, image.Pt(kernel, kernel), 0, 0, gocv.BorderDefault)
		processed.Close()
		processed = blurred.Clone()
	}

	binary := gocv.NewMat()
	defer binary.Close()

	applyCanny := req.ImageCannyLow > 0 && req.ImageCannyHigh > 0
	if applyCanny {
		gocv.Canny(processed, &binary, req.ImageCannyLow, req.ImageCannyHigh)
	} else {
		threshold := clampFloat(req.ImageThreshold, 0.0, 1.0)
		if threshold == 0 {
			threshold = defaultImageThreshold
		}
		thresholdValue := float32(threshold * 255.0)
		threshType := gocv.ThresholdBinary
		if req.ImageInvert {
			threshType = gocv.ThresholdBinaryInv
		}
		gocv.Threshold(processed, &binary, thresholdValue, 255, threshType)
	}

	morphKernel := gocv.GetStructuringElement(gocv.MorphRect, image.Pt(3, 3))
	defer morphKernel.Close()
	cleaned := gocv.NewMat()
	defer cleaned.Close()
	gocv.MorphologyEx(binary, &cleaned, gocv.MorphClose, morphKernel)

	if req.ImageSkeletonize {
		skeleton := skeletonize(cleaned)
		cleaned.Close()
		cleaned = skeleton
	}

	contours := findFilteredContours(cleaned, req.IncludeHoles, req.ImageMinContourArea, req.ImageMaxContours)
	if len(contours) == 0 {
		return nil, errors.New("no contours detected")
	}

	if req.ImageSingleContour && len(contours) > 1 {
		contours = contours[:1]
	}

	simplified := simplifyContours(contours, req.Simplification, req.Smoothing)
	if len(simplified) == 0 {
		return nil, errors.New("all contour paths were empty after simplification")
	}

	highResGrid := req.ImageHighResGrid
	if highResGrid <= 0 || highResGrid < req.GridWidth || highResGrid < req.GridHeight {
		highResGrid = defaultHighResGrid
	}

	highRes := normalizeContours(simplified, highResGrid, highResGrid)
	downsampled := downsampleContours(highRes, highResGrid, req.GridWidth, req.GridHeight)
	if len(downsampled) == 0 {
		return nil, errors.New("downsampled contours are empty")
	}

	return normalizeContours(downsampled, req.GridWidth, req.GridHeight), nil
}

func kernelSizeFromRadius(radius float64) int {
	if radius <= 0 {
		return 1
	}
	base := int(math.Round(radius))*2 + 1
	if base < 3 {
		base = 3
	}
	if base%2 == 0 {
		base++
	}
	return base
}

func findFilteredContours(src gocv.Mat, includeHoles bool, minAreaRatio float64, maxContours int) [][]image.Point {
	mode := gocv.RetrievalExternal
	if includeHoles {
		mode = gocv.RetrievalTree
	}

	contoursVec := gocv.FindContours(src, mode, gocv.ChainApproxSimple)
	defer contoursVec.Close()

	totalPixels := float64(src.Rows() * src.Cols())
	minArea := clampFloat(minAreaRatio, 0, 1)
	if minArea <= 0 {
		minArea = defaultMinContourAreaRatio
	}
	minPixels := minArea * totalPixels

	type contourWithArea struct {
		points []image.Point
		area   float64
	}

	filtered := make([]contourWithArea, 0, contoursVec.Size())
	for i := 0; i < contoursVec.Size(); i++ {
		pv := contoursVec.At(i)
		area := math.Abs(gocv.ContourArea(pv))
		if area < minPixels {
			pv.Close()
			continue
		}
		filtered = append(filtered, contourWithArea{
			points: pv.ToPoints(),
			area:   area,
		})
		pv.Close()
	}

	if len(filtered) == 0 {
		return nil
	}

	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].area > filtered[j].area
	})

	limit := maxContours
	if limit <= 0 {
		limit = defaultMaxDetectedContours
	}
	if len(filtered) > limit {
		filtered = filtered[:limit]
	}

	result := make([][]image.Point, len(filtered))
	for i, c := range filtered {
		result[i] = c.points
	}
	return result
}

func simplifyContours(paths [][]image.Point, epsilon float64, smoothing int) [][]image.Point {
	if len(paths) == 0 {
		return nil
	}

	if epsilon <= 0 {
		epsilon = defaultSimplification
	}

	result := make([][]image.Point, 0, len(paths))
	for _, contour := range paths {
		simplified := simplifyContourPath(contour, epsilon)
		smoothed := smoothPath(simplified, smoothing)
		dedup := deduplicatePath(smoothed)
		if len(dedup) == 0 {
			continue
		}
		result = append(result, dedup)
	}

	return result
}

func skeletonize(src gocv.Mat) gocv.Mat {
	skeleton := gocv.Zeros(src.Rows(), src.Cols(), gocv.MatTypeCV8U)
	element := gocv.GetStructuringElement(gocv.MorphCross, image.Pt(3, 3))
	eroded := src.Clone()
	defer eroded.Close()
	temp := gocv.NewMat()
	defer temp.Close()

	for {
		gocv.MorphologyEx(eroded, &temp, gocv.MorphOpen, element)
		gocv.BitwiseNot(temp, &temp)
		gocv.BitwiseAnd(eroded, temp, &temp)
		gocv.BitwiseOr(skeleton, temp, &skeleton)
		gocv.Erode(eroded, &eroded, element)
		if gocv.CountNonZero(eroded) == 0 {
			break
		}
	}

	element.Close()
	return skeleton
}

func reversePoints(points []image.Point) {
	for i, j := 0, len(points)-1; i < j; i, j = i+1, j-1 {
		points[i], points[j] = points[j], points[i]
	}
}

func loadImage(ctx context.Context, source string) ([]byte, error) {
	if strings.TrimSpace(source) == "" {
		return nil, errors.New("image source is empty")
	}
	if strings.HasPrefix(source, "data:") {
		return loadDataURLImage(source)
	}

	if parsed, err := url.Parse(source); err == nil && parsed.Scheme != "" {
		switch parsed.Scheme {
		case "http", "https":
			return loadRemoteImage(ctx, source)
		case "s3", "minio":
			client, _, bucket, prefix, _, err := getMinio()
			if err != nil {
				return nil, fmt.Errorf("get minio client: %w", err)
			}
			object := strings.TrimPrefix(parsed.Path, "/")
			if prefix != "" && !strings.HasPrefix(object, prefix) {
				object = strings.Trim(prefix+"/"+object, "/")
			}
			return loadMinioObject(ctx, client, bucket, object)
		default:
			return nil, fmt.Errorf("unsupported image scheme: %s", parsed.Scheme)
		}
	}

	return loadLocalImage(source)
}

func loadDataURLImage(dataURL string) ([]byte, error) {
	comma := strings.IndexRune(dataURL, ',')
	if comma == -1 {
		return nil, errors.New("invalid data URL format")
	}

	meta := dataURL[:comma]
	dataPart := dataURL[comma+1:]

	if strings.Contains(meta, ";base64") {
		decoded, err := base64.StdEncoding.DecodeString(dataPart)
		if err != nil {
			return nil, fmt.Errorf("decode data URL: %w", err)
		}
		if int64(len(decoded)) > maxRemoteImageSize {
			return nil, fmt.Errorf("data URL image exceeds limit (%d bytes)", maxRemoteImageSize)
		}
		return decoded, nil
	}

	unescaped, err := url.QueryUnescape(dataPart)
	if err != nil {
		return nil, fmt.Errorf("unescape data URL: %w", err)
	}
	if int64(len(unescaped)) > maxRemoteImageSize {
		return nil, fmt.Errorf("data URL image exceeds limit (%d bytes)", maxRemoteImageSize)
	}
	return []byte(unescaped), nil
}

func loadLocalImage(path string) ([]byte, error) {
	if !filepath.IsAbs(path) {
		cwd, err := os.Getwd()
		if err != nil {
			return nil, fmt.Errorf("get cwd: %w", err)
		}
		path = filepath.Join(cwd, path)
	}
	info, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("stat local image: %w", err)
	}
	if info.IsDir() {
		return nil, errors.New("image path points to directory")
	}
	if info.Size() > maxRemoteImageSize {
		return nil, fmt.Errorf("local image exceeds limit (%d bytes)", maxRemoteImageSize)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read local image: %w", err)
	}
	return data, nil
}

func normalizeContours(paths [][]image.Point, gridWidth, gridHeight int) [][]image.Point {
	if len(paths) == 0 {
		return paths
	}

	minX, minY := math.MaxFloat64, math.MaxFloat64
	maxX, maxY := -math.MaxFloat64, -math.MaxFloat64

	for _, path := range paths {
		for _, p := range path {
			x := float64(p.X)
			y := float64(p.Y)
			if x < minX {
				minX = x
			}
			if y < minY {
				minY = y
			}
			if x > maxX {
				maxX = x
			}
			if y > maxY {
				maxY = y
			}
		}
	}

	width := maxX - minX
	height := maxY - minY
	if width == 0 {
		width = 1
	}
	if height == 0 {
		height = 1
	}

	scaleX := float64(gridWidth-1) / width
	scaleY := float64(gridHeight-1) / height
	scale := math.Min(scaleX, scaleY)

	offsetX := (float64(gridWidth-1) - width*scale) / 2
	offsetY := (float64(gridHeight-1) - height*scale) / 2

	normalized := make([][]image.Point, 0, len(paths))
	for _, path := range paths {
		out := make([]image.Point, 0, len(path))
		for _, pt := range path {
			x := int(math.Round((float64(pt.X)-minX)*scale + offsetX))
			y := int(math.Round((float64(pt.Y)-minY)*scale + offsetY))
			x = clampInt(x, 0, gridWidth-1)
			y = clampInt(y, 0, gridHeight-1)
			out = append(out, image.Point{X: x, Y: y})
		}
		normalized = append(normalized, out)
	}
	return normalized
}

func downsampleContours(paths [][]image.Point, highRes, targetWidth, targetHeight int) [][]image.Point {
	if len(paths) == 0 {
		return paths
	}

	if targetWidth <= 0 || targetHeight <= 0 {
		return paths
	}

	scaleX := float64(targetWidth-1) / float64(highRes-1)
	scaleY := float64(targetHeight-1) / float64(highRes-1)

	result := make([][]image.Point, 0, len(paths))

	for _, path := range paths {
		if len(path) == 0 {
			continue
		}

		out := make([]image.Point, 0, len(path))
		var last image.Point
		haveLast := false

		for _, pt := range path {
			x := clampInt(int(math.Round(float64(pt.X)*scaleX)), 0, targetWidth-1)
			y := clampInt(int(math.Round(float64(pt.Y)*scaleY)), 0, targetHeight-1)
			mapped := image.Point{X: x, Y: y}
			if !haveLast || mapped != last {
				out = append(out, mapped)
				last = mapped
				haveLast = true
			}
		}

		out = deduplicatePath(out)
		if len(out) == 0 {
			continue
		}
		out = simplifyContourPath(out, defaultSimplification)
		out = deduplicatePath(out)
		if len(out) == 0 {
			continue
		}

		result = append(result, out)
	}

	return result
}

func clampInt(value, min, max int) int {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func clampFloat(value float64, min, max float64) float64 {
	if math.IsNaN(value) {
		return min
	}
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func simplifyContourPath(points []image.Point, epsilon float64) []image.Point {
	if len(points) <= 2 {
		cp := make([]image.Point, len(points))
		copy(cp, points)
		return cp
	}

	sqEps := epsilon * epsilon
	var simplify func([]image.Point) []image.Point
	simplify = func(pts []image.Point) []image.Point {
		if len(pts) <= 2 {
			res := make([]image.Point, len(pts))
			copy(res, pts)
			return res
		}
		start := pts[0]
		end := pts[len(pts)-1]
		maxDist := 0.0
		index := 0
		for i := 1; i < len(pts)-1; i++ {
			dist := pointLineDistanceSq(pts[i], start, end)
			if dist > maxDist {
				maxDist = dist
				index = i
			}
		}
		if maxDist <= sqEps {
			return []image.Point{start, end}
		}
		left := simplify(pts[:index+1])
		right := simplify(pts[index:])
		return append(left[:len(left)-1], right...)
	}

	result := simplify(points)
	return result
}

func pointLineDistanceSq(p, a, b image.Point) float64 {
	if a == b {
		dx := float64(p.X - a.X)
		dy := float64(p.Y - a.Y)
		return dx*dx + dy*dy
	}
	ax := float64(a.X)
	ay := float64(a.Y)
	bx := float64(b.X)
	by := float64(b.Y)
	px := float64(p.X)
	py := float64(p.Y)

	dx := bx - ax
	dy := by - ay

	t := ((px-ax)*dx + (py-ay)*dy) / (dx*dx + dy*dy)
	if t < 0 {
		t = 0
	} else if t > 1 {
		t = 1
	}
	projX := ax + t*dx
	projY := ay + t*dy

	diffX := px - projX
	diffY := py - projY
	return diffX*diffX + diffY*diffY
}

func smoothPath(points []image.Point, smoothing int) []image.Point {
	if smoothing <= 0 || len(points) < 3 {
		res := make([]image.Point, len(points))
		copy(res, points)
		return res
	}
	if smoothing > maxSmoothingWindowSize {
		smoothing = maxSmoothingWindowSize
	}
	window := smoothing*2 + 1
	smoothed := make([]image.Point, len(points))
	copy(smoothed, points)

	for i := range points {
		if i < smoothing || i >= len(points)-smoothing {
			continue
		}
		sumX := 0
		sumY := 0
		for j := -smoothing; j <= smoothing; j++ {
			sumX += points[i+j].X
			sumY += points[i+j].Y
		}
		smoothed[i] = image.Point{X: sumX / window, Y: sumY / window}
	}
	return smoothed
}

func deduplicatePath(points []image.Point) []image.Point {
	if len(points) == 0 {
		return points
	}
	result := make([]image.Point, 0, len(points))
	prev := points[0]
	result = append(result, prev)
	for _, p := range points[1:] {
		if p != prev {
			result = append(result, p)
			prev = p
		}
	}
	return result
}

func firstPoint(paths [][]image.Point) (int, int, error) {
	for _, path := range paths {
		if len(path) > 0 {
			return path[0].Y, path[0].X, nil
		}
	}
	return 0, 0, errEmptyPath
}

func selectTemplate(matcher *shapes.Matcher, req api.GenerateRequest) (*shapes.ShapeTemplate, error) {
	if matcher == nil {
		var err error
		matcher, err = shapes.DefaultMatcher()
		if err != nil {
			return nil, fmt.Errorf("load templates: %w", err)
		}
	}
	if name := strings.TrimSpace(req.ShapeName); name != "" {
		if tmpl := matcher.GetByName(strings.ToLower(name)); tmpl != nil {
			return tmpl, nil
		}
	}
	if desc := strings.TrimSpace(req.Description); desc != "" {
		if tmpl := matcher.MatchDescription(desc, strings.TrimSpace(req.Difficulty)); tmpl != nil {
			return tmpl, nil
		}
		return nil, fmt.Errorf("no matching template for description")
	}

	tmpl := matcher.Random(strings.TrimSpace(req.Difficulty))
	if tmpl == nil {
		return nil, errors.New("no templates available")
	}
	return tmpl, nil
}

func generateTemplatePaths(req api.GenerateRequest, tmpl *shapes.ShapeTemplate) ([][]image.Point, error) {
	if tmpl == nil {
		return nil, errors.New("template is nil")
	}
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	raw := tmpl.Generator(req.GridWidth, req.GridHeight, rng)
	if len(raw) == 0 {
		return nil, errors.New("template returned empty path")
	}
	clamped := make([][]image.Point, 0, len(raw))
	for _, path := range raw {
		dedup := deduplicatePath(path)
		if len(dedup) == 0 {
			continue
		}
		for i := range dedup {
			dedup[i].X = clampInt(dedup[i].X, 0, req.GridWidth-1)
			dedup[i].Y = clampInt(dedup[i].Y, 0, req.GridHeight-1)
		}
		clamped = append(clamped, dedup)
	}
	if len(clamped) == 0 {
		return nil, errors.New("template produced no valid paths")
	}
	return clamped, nil
}

func buildCommandsFromPaths(paths [][]image.Point, allowDiagonals bool) ([]api.Command, error) {
	if len(paths) == 0 {
		return nil, errEmptyPath
	}
	cmds := make([]api.Command, 0)

	appendCommand := func(direction string, steps int) {
		if steps <= 0 {
			return
		}
		if len(cmds) > 0 && cmds[len(cmds)-1].Direction == direction {
			cmds[len(cmds)-1].Steps += steps
			return
		}
		cmds = append(cmds, api.Command{Action: "draw", Direction: direction, Steps: steps})
	}

	for _, path := range paths {
		if len(path) < 2 {
			continue
		}
		for i := 1; i < len(path); i++ {
			dx := path[i].X - path[i-1].X
			dy := path[i].Y - path[i-1].Y
			segments, err := directionsForDelta(dx, dy, allowDiagonals)
			if err != nil {
				return nil, err
			}
			for _, seg := range segments {
				appendCommand(seg.direction, seg.steps)
			}
		}
	}

	if len(cmds) == 0 {
		return nil, errors.New("no drawable commands")
	}
	return cmds, nil
}

type deltaSegment struct {
	direction string
	steps     int
}

func directionsForDelta(dx, dy int, allowDiag bool) ([]deltaSegment, error) {
	if dx == 0 && dy == 0 {
		return nil, nil
	}
	if allowDiag {
		dir := directionFromDelta(dx, dy)
		if dir == "" {
			return nil, fmt.Errorf("unsupported diagonal delta dx=%d dy=%d", dx, dy)
		}
		steps := maxInt(absInt(dx), absInt(dy))
		return []deltaSegment{{direction: dir, steps: steps}}, nil
	}

	segments := make([]deltaSegment, 0, 2)
	if dx != 0 {
		dir := directionFromDelta(dx, 0)
		if dir == "" {
			return nil, fmt.Errorf("unsupported horizontal delta dx=%d", dx)
		}
		segments = append(segments, deltaSegment{direction: dir, steps: absInt(dx)})
	}
	if dy != 0 {
		dir := directionFromDelta(0, dy)
		if dir == "" {
			return nil, fmt.Errorf("unsupported vertical delta dy=%d", dy)
		}
		segments = append(segments, deltaSegment{direction: dir, steps: absInt(dy)})
	}
	return segments, nil
}

func directionFromDelta(dx, dy int) string {
	switch {
	case dx > 0 && dy == 0:
		return "right"
	case dx < 0 && dy == 0:
		return "left"
	case dy > 0 && dx == 0:
		return "down"
	case dy < 0 && dx == 0:
		return "up"
	case dx > 0 && dy > 0 && absInt(dx) == absInt(dy):
		return "down-right"
	case dx < 0 && dy > 0 && absInt(dx) == absInt(dy):
		return "down-left"
	case dx > 0 && dy < 0 && absInt(dx) == absInt(dy):
		return "up-right"
	case dx < 0 && dy < 0 && absInt(dx) == absInt(dy):
		return "up-left"
	}
	return ""
}

func buildInstructions(commands []api.Command) string {
	if len(commands) == 0 {
		return ""
	}
	var builder strings.Builder
	for idx, cmd := range commands {
		builder.WriteString(fmt.Sprintf("%d. Проведи линию %s на %d клеток.\n", idx+1, humanizeDirection(cmd.Direction), cmd.Steps))
	}
	return strings.TrimSpace(builder.String())
}

func humanizeDirection(dir string) string {
	switch dir {
	case "up":
		return "вверх"
	case "down":
		return "вниз"
	case "left":
		return "влево"
	case "right":
		return "вправо"
	case "up-right":
		return "по диагонали вверх-вправо"
	case "up-left":
		return "по диагонали вверх-влево"
	case "down-right":
		return "по диагонали вниз-вправо"
	case "down-left":
		return "по диагонали вниз-влево"
	default:
		return dir
	}
}

func absInt(v int) int {
	if v < 0 {
		return -v
	}
	return v
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

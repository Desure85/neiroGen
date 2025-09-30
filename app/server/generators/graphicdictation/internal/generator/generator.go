package generator

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"io"
	"math"
	"net/http"
	"net/url"
	"os"
	"path"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/disintegration/imaging"
	gojson "github.com/goccy/go-json"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"gocv.io/x/gocv"

	"neirogen/app/server/generators/graphicdictation/internal/api"
	"neirogen/app/server/generators/graphicdictation/internal/shapes"
)

func loadImage(source string) ([]byte, error) {
	trimmed := strings.TrimSpace(source)
	if trimmed == "" {
		return nil, fmt.Errorf("empty source image path")
	}

	switch {
	case strings.HasPrefix(trimmed, "data:"):
		return loadDataURLImage(trimmed)
	case strings.HasPrefix(trimmed, "http://"), strings.HasPrefix(trimmed, "https://"):
		return loadRemoteImage(trimmed)
	case strings.HasPrefix(trimmed, "s3://"):
		return loadMinioObject(trimmed)
	default:
		return loadLocalImage(trimmed)
	}
}

func loadDataURLImage(dataURL string) ([]byte, error) {
	commaIdx := strings.IndexRune(dataURL, ',')
	if commaIdx < 0 {
		return nil, fmt.Errorf("invalid data url: missing comma")
	}

	meta := strings.ToLower(strings.TrimSpace(dataURL[:commaIdx]))
	payload := strings.TrimSpace(dataURL[commaIdx+1:])
	if payload == "" {
		return nil, fmt.Errorf("data url has empty payload")
	}

	var data []byte
	if strings.Contains(meta, ";base64") {
		decoded, err := base64.StdEncoding.DecodeString(payload)
		if err != nil {
			decoded, err = base64.RawStdEncoding.DecodeString(payload)
			if err != nil {
				return nil, fmt.Errorf("decode data url: %w", err)
			}
		}
		data = decoded
	} else {
		decoded, err := url.QueryUnescape(payload)
		if err != nil {
			return nil, fmt.Errorf("decode data url: %w", err)
		}
		data = []byte(decoded)
	}

	if len(data) == 0 {
		return nil, fmt.Errorf("data url has empty payload")
	}
	if len(data) > maxRemoteImageSize {
		return nil, fmt.Errorf("image exceeds %d bytes", maxRemoteImageSize)
	}

	return data, nil
}

func loadMinioObject(uri string) ([]byte, error) {
	trimmed := strings.TrimPrefix(uri, "s3://")
	parts := strings.SplitN(trimmed, "/", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return nil, fmt.Errorf("invalid s3 uri: %s", uri)
	}

	client, _, _, _, _, err := getMinio()
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), remoteDownloadTimeout)
	defer cancel()

	object, err := client.GetObject(ctx, parts[0], parts[1], minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("minio get object: %w", err)
	}
	defer object.Close()

	limited := io.LimitReader(object, maxRemoteImageSize+1)
	data, err := io.ReadAll(limited)
	if err != nil {
		return nil, fmt.Errorf("read minio object: %w", err)
	}
	if len(data) > maxRemoteImageSize {
		return nil, fmt.Errorf("object exceeds %d bytes", maxRemoteImageSize)
	}

	return data, nil
}

func loadLocalImage(path string) ([]byte, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open image: %w", err)
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("read image: %w", err)
	}

	return data, nil
}

func generateContoursFromImage(req api.GenerateRequest) ([][]image.Point, error) {
	data, err := loadImage(req.SourceImage)
	if err != nil {
		return nil, err
	}

	img, err := gocv.IMDecode(data, gocv.IMReadColor)
	if err != nil {
		return nil, fmt.Errorf("decode image: %w", err)
	}
	if img.Empty() {
		return nil, errors.New("decoded image is empty")
	}
	defer img.Close()

	gray := gocv.NewMat()
	defer gray.Close()
	gocv.CvtColor(img, &gray, gocv.ColorBGRToGray)

	if req.ImageBlurRadius > 0 {
		ksize := int(math.Round(req.ImageBlurRadius*2) + 1)
		if ksize < 3 {
			ksize = 3
		}
		if ksize%2 == 0 {
			ksize++
		}
		gocv.GaussianBlur(gray, &gray, image.Pt(ksize, ksize), 0, 0, gocv.BorderDefault)
	}

	binary := gocv.NewMat()
	defer binary.Close()

	threshold := req.ImageThreshold
	if threshold <= 0 {
		threshold = 0.5
	}
	if threshold >= 1 {
		threshold = math.Nextafter(1, 0)
	}
	threshVal := float32(threshold * 255)
	if req.ImageInvert {
		gocv.Threshold(gray, &binary, threshVal, 255, gocv.ThresholdBinaryInv)
	} else {
		gocv.Threshold(gray, &binary, threshVal, 255, gocv.ThresholdBinary)
	}

	contours, err := findHierarchicalContours(binary, req.IncludeHoles)
	if err != nil {
		return nil, err
	}
	if len(contours) == 0 {
		return nil, errors.New("unable to build path for dictation")
	}

	scaled := normalizeContours(contours, req.GridWidth, req.GridHeight)

	epsilon := req.Simplification
	if epsilon == 0 {
		epsilon = 1.5
	}
	simplified := make([][]image.Point, 0, len(scaled))
	for _, path := range scaled {
		if len(path) == 0 {
			continue
		}
		sp := simplifyContourPath(path, epsilon)
		if req.Smoothing > 0 {
			sp = smoothPath(sp, req.Smoothing)
		}
		simplified = append(simplified, sp)
	}

	if len(simplified) == 0 {
		return nil, errors.New("unable to build path for dictation")
	}

	return simplified, nil
}

func findHierarchicalContours(binary gocv.Mat, includeHoles bool) ([][]image.Point, error) {
	mode := gocv.RetrievalExternal
	if includeHoles {
		mode = gocv.RetrievalTree
	}

	hierarchy := gocv.NewMat()
	defer hierarchy.Close()

	contoursVec := gocv.FindContoursWithParams(binary, &hierarchy, mode, gocv.ChainApproxNone)
	pointsVec := contoursVec.ToPoints()
	if len(pointsVec) == 0 {
		return nil, nil
	}

	convertContour := func(contour []image.Point) []image.Point {
		if len(contour) == 0 {
			return nil
		}
		result := make([]image.Point, len(contour))
		copy(result, contour)
		return normalizeContourLoop(result)
	}

	paths := make([][]image.Point, 0, len(pointsVec))
	indices := make([]int, 0, len(pointsVec))
	for idx, contour := range pointsVec {
		pts := convertContour(contour)
		if len(pts) == 0 {
			continue
		}
		paths = append(paths, pts)
		indices = append(indices, idx)
	}

	if len(paths) == 0 {
		return nil, nil
	}

	if !includeHoles || mode != gocv.RetrievalTree || hierarchy.Empty() {
		return paths, nil
	}

	parentOf := func(idx int) (int, bool) {
		if idx < 0 || idx >= len(pointsVec) {
			return -1, false
		}
		// OpenCV stores hierarchy as either 1 x (n*4) or n x 4 matrix.
		switch {
		case hierarchy.Rows() == 1:
			col := idx * 4
			if hierarchy.Cols() < col+4 {
				return -1, false
			}
			vec := hierarchy.GetVeciAt(0, col)
			if len(vec) < 4 {
				return -1, false
			}
			return int(vec[3]), true
		case hierarchy.Rows() > idx:
			vec := hierarchy.GetVeciAt(idx, 0)
			if len(vec) < 4 {
				return -1, false
			}
			return int(vec[3]), true
		default:
			return -1, false
		}
	}

	levels := make([]int, len(pointsVec))
	computed := make([]bool, len(pointsVec))

	var levelOf func(int) int
	levelOf = func(idx int) int {
		if idx < 0 {
			return -1
		}
		if idx >= len(pointsVec) {
			return 0
		}
		if computed[idx] {
			return levels[idx]
		}
		parent, ok := parentOf(idx)
		if !ok || parent < 0 {
			levels[idx] = 0
			computed[idx] = true
			return levels[idx]
		}
		if parent < 0 {
			levels[idx] = 0
		} else {
			levels[idx] = levelOf(parent) + 1
		}
		computed[idx] = true
		return levels[idx]
	}

	for i, contourIdx := range indices {
		lvl := levelOf(contourIdx)
		if lvl%2 == 1 {
			reversePoints(paths[i])
		}
	}

	return paths, nil
}

func normalizeContourLoop(points []image.Point) []image.Point {
	if len(points) <= 1 {
		return points
	}

	deduped := deduplicatePath(points)
	if len(deduped) > 1 && deduped[0] != deduped[len(deduped)-1] {
		deduped = append(deduped, deduped[0])
	}

	return deduped
}

func reversePoints(points []image.Point) {
	for i, j := 0, len(points)-1; i < j; i, j = i+1, j-1 {
		points[i], points[j] = points[j], points[i]
	}
}

func normalizeContours(contours [][]image.Point, gridW, gridH int) [][]image.Point {
	if len(contours) == 0 {
		return nil
	}

	minX, minY := contours[0][0].X, contours[0][0].Y
	maxX, maxY := minX, minY
	for _, contour := range contours {
		for _, pt := range contour {
			if pt.X < minX {
				minX = pt.X
			}
			if pt.Y < minY {
				minY = pt.Y
			}
			if pt.X > maxX {
				maxX = pt.X
			}
			if pt.Y > maxY {
				maxY = pt.Y
			}
		}
	}

	width := max(maxX-minX, 1)
	height := max(maxY-minY, 1)
	gridWidth := max(gridW, 1)
	gridHeight := max(gridH, 1)

	scaleX := float64(gridWidth-1) / float64(width)
	scaleY := float64(gridHeight-1) / float64(height)
	scale := math.Min(scaleX, scaleY)

	marginX := float64(gridWidth-1) - float64(width)*scale
	marginY := float64(gridHeight-1) - float64(height)*scale

	paths := make([][]image.Point, len(contours))
	for i, contour := range contours {
		path := make([]image.Point, len(contour))
		for j, pt := range contour {
			x := (float64(pt.X-minX) * scale) + marginX/2
			y := (float64(pt.Y-minY) * scale) + marginY/2
			path[j] = image.Point{X: int(math.Round(x)), Y: int(math.Round(y))}
		}
		paths[i] = deduplicatePath(path)
	}

	return paths
}

func deduplicatePath(path []image.Point) []image.Point {
	if len(path) <= 1 {
		return path
	}
	result := []image.Point{path[0]}
	for i := 1; i < len(path); i++ {
		if path[i] != result[len(result)-1] {
			result = append(result, path[i])
		}
	}
	return result
}

func renderPreviews(req api.GenerateRequest, paths [][]image.Point) (string, string, error) {
	client, presignClient, bucket, prefix, ttl, err := getMinio()
	if err != nil {
		return "", "", err
	}

	baseName := fmt.Sprintf("%s-%d", sanitize(req.JobID), time.Now().UnixNano())
	pngKey := path.Join(prefix, baseName+".png")
	svgKey := path.Join(prefix, baseName+".svg")

	pngData, err := renderPNG(req, paths)
	if err != nil {
		return "", "", fmt.Errorf("render png: %w", err)
	}

	svgData, err := renderSVG(req, paths)
	if err != nil {
		return "", "", fmt.Errorf("render svg: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), remoteDownloadTimeout)
	defer cancel()

	if _, err := client.PutObject(ctx, bucket, pngKey, bytes.NewReader(pngData), int64(len(pngData)), minio.PutObjectOptions{ContentType: "image/png"}); err != nil {
		return "", "", fmt.Errorf("upload preview png: %w", err)
	}

	if _, err := client.PutObject(ctx, bucket, svgKey, bytes.NewReader(svgData), int64(len(svgData)), minio.PutObjectOptions{ContentType: "image/svg+xml"}); err != nil {
		return "", "", fmt.Errorf("upload preview svg: %w", err)
	}

	pngURL, err := presignClient.PresignedGetObject(ctx, bucket, pngKey, ttl, nil)
	if err != nil {
		return "", "", fmt.Errorf("presign png: %w", err)
	}

	svgURL, err := presignClient.PresignedGetObject(ctx, bucket, svgKey, ttl, nil)
	if err != nil {
		return "", "", fmt.Errorf("presign svg: %w", err)
	}

	replaceHost := func(raw string) string {
		if minioPublicHost == "" {
			return raw
		}
		parsed, err := url.Parse(raw)
		if err != nil {
			return raw
		}
		parsed.Scheme = minioPublicScheme
		parsed.Host = minioPublicHost
		return parsed.String()
	}

	return replaceHost(pngURL.String()), replaceHost(svgURL.String()), nil
}

func renderPNG(req api.GenerateRequest, paths [][]image.Point) ([]byte, error) {
	width := max(req.GridWidth*req.CellSizeMM, 1)
	height := max(req.GridHeight*req.CellSizeMM, 1)

	img := image.NewRGBA(image.Rect(0, 0, width, height))
	draw.Draw(img, img.Bounds(), &image.Uniform{C: color.White}, image.Point{}, draw.Src)

	gridColor := color.RGBA{200, 200, 200, 255}
	for x := 0; x <= req.GridWidth; x++ {
		lineX := x * req.CellSizeMM
		drawLine(img, image.Point{X: lineX, Y: 0}, image.Point{X: lineX, Y: height}, gridColor)
	}
	for y := 0; y <= req.GridHeight; y++ {
		lineY := y * req.CellSizeMM
		drawLine(img, image.Point{X: 0, Y: lineY}, image.Point{X: width, Y: lineY}, gridColor)
	}

	for _, path := range paths {
		polyline := toCanvasPolyline(path, req.CellSizeMM)
		for i := 1; i < len(polyline); i++ {
			drawLine(img, polyline[i-1], polyline[i], color.Black)
		}
	}

	buf := &bytes.Buffer{}
	if err := imaging.Encode(buf, img, imaging.PNG); err != nil {
		return nil, fmt.Errorf("encode png: %w", err)
	}
	return buf.Bytes(), nil
}

func renderSVG(req api.GenerateRequest, paths [][]image.Point) ([]byte, error) {
	width := max(req.GridWidth*req.CellSizeMM, 1)
	height := max(req.GridHeight*req.CellSizeMM, 1)

	builder := &strings.Builder{}
	fmt.Fprintf(builder, "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"%d\" height=\"%d\" viewBox=\"0 0 %d %d\">\n", width, height, width, height)
	builder.WriteString("<rect width=\"100%\" height=\"100%\" fill=\"white\"/>\n")

	for _, path := range paths {
		polyline := toCanvasPolyline(path, req.CellSizeMM)
		if len(polyline) <= 1 {
			continue
		}
		builder.WriteString("<polyline fill=\"none\" stroke=\"black\" stroke-width=\"2\" points=\"")
		for i, pt := range polyline {
			if i > 0 {
				builder.WriteByte(' ')
			}
			fmt.Fprintf(builder, "%d,%d", pt.X, pt.Y)
		}
		builder.WriteString("\"/>\n")
	}

	builder.WriteString("</svg>")
	return []byte(builder.String()), nil
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
	data, err := gojson.Marshal(commands)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func getMinio() (*minio.Client, *minio.Client, string, string, time.Duration, error) {
	minioOnce.Do(func() {
		endpoint := strings.TrimSpace(os.Getenv("MINIO_ENDPOINT"))
		accessKey := strings.TrimSpace(os.Getenv("MINIO_ACCESS_KEY"))
		secretKey := strings.TrimSpace(os.Getenv("MINIO_SECRET_KEY"))
		bucket := strings.TrimSpace(os.Getenv("MINIO_BUCKET"))
		if bucket == "" {
			bucket = strings.TrimSpace(os.Getenv("AWS_BUCKET"))
		}

		if endpoint == "" || accessKey == "" || secretKey == "" || bucket == "" {
			minioConfigErr = errors.New("minio configuration is incomplete")
			return
		}

		secure := false
		host := endpoint
		if strings.HasPrefix(endpoint, "http://") || strings.HasPrefix(endpoint, "https://") {
			parsed, err := url.Parse(endpoint)
			if err != nil {
				minioConfigErr = fmt.Errorf("parse MINIO_ENDPOINT: %w", err)
				return
			}
			secure = parsed.Scheme == "https"
			host = parsed.Host
			if host == "" {
				host = parsed.Path
			}
		}

		client, err := minio.New(host, &minio.Options{
			Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
			Secure: secure,
		})
		if err != nil {
			minioConfigErr = fmt.Errorf("init minio client: %w", err)
			return
		}

		prefix := strings.Trim(strings.TrimSpace(os.Getenv("MINIO_RESULT_PREFIX")), "/")
		if prefix == "" {
			prefix = defaultResultPrefix
		}

		ttlMinutes := defaultSignedURLTTLMin
		if ttlStr := strings.TrimSpace(os.Getenv("MINIO_SIGNED_URL_TTL")); ttlStr != "" {
			if parsedTTL, err := strconv.Atoi(ttlStr); err == nil && parsedTTL > 0 {
				ttlMinutes = parsedTTL
			}
		}

		minioClient = client
		minioPresignClient = client
		minioBucket = bucket
		minioResultPrefix = prefix
		minioSignedURLTTL = time.Duration(ttlMinutes) * time.Minute

		if publicEndpoint := strings.TrimSpace(os.Getenv("MINIO_PUBLIC_ENDPOINT")); publicEndpoint != "" {
			if !strings.Contains(publicEndpoint, "://") {
				publicEndpoint = "http://" + publicEndpoint
			}
			parsedPublic, err := url.Parse(publicEndpoint)
			if err != nil {
				minioConfigErr = fmt.Errorf("parse MINIO_PUBLIC_ENDPOINT: %w", err)
				return
			}
			publicHost := parsedPublic.Host
			if publicHost == "" {
				publicHost = parsedPublic.Path
			}
			publicClient, err := minio.New(publicHost, &minio.Options{
				Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
				Secure: parsedPublic.Scheme == "https",
			})
			if err != nil {
				minioConfigErr = fmt.Errorf("init public minio client: %w", err)
				return
			}
			minioPresignClient = publicClient
		}
	})

	if minioConfigErr != nil {
		return nil, nil, "", "", 0, minioConfigErr
	}
	return minioClient, minioPresignClient, minioBucket, minioResultPrefix, minioSignedURLTTL, nil
}

func sanitize(value string) string {
	cleaned := sanitizeRegexp.ReplaceAllString(value, "-")
	cleaned = strings.Trim(cleaned, "-")
	if cleaned == "" {
		cleaned = "preview"
	}
	if len(cleaned) > 64 {
		cleaned = cleaned[:64]
	}
	return cleaned
}

func applyPublicEndpoint(u *url.URL, publicEndpoint string) string {
	if publicEndpoint == "" {
		return u.String()
	}

	parsed, err := url.Parse(publicEndpoint)
	if err != nil {
		return u.String()
	}

	adjusted := *u

	if parsed.Scheme != "" {
		adjusted.Scheme = parsed.Scheme
	}

	if parsed.Host != "" {
		adjusted.Host = parsed.Host
	}

	return adjusted.String()
}

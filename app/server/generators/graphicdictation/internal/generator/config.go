package generator

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

const (
	defaultSignedURLTTLMin = 15
	defaultResultPrefix    = "graphic-dictation/results"
	maxRemoteImageSize     = 50 * 1024 * 1024
)

var (
	initOnce sync.Once
	initErr  error

	minioClient        *minio.Client
	minioPresignClient *minio.Client
	minioBucket        string
	minioResultPrefix  string
	minioSignedURLTTL  time.Duration
	minioPublicHost    string
	minioPublicScheme  string

	remoteHTTPClient = &http.Client{Timeout: 30 * time.Second}
	sanitizeRegexp   = regexp.MustCompile(`[^a-zA-Z0-9\-_]+`)
)

func getMinio() (*minio.Client, *minio.Client, string, string, time.Duration, error) {
	initOnce.Do(func() {
		initErr = initMinio()
	})
	if initErr != nil {
		return nil, nil, "", "", 0, initErr
	}
	return minioClient, minioPresignClient, minioBucket, minioResultPrefix, minioSignedURLTTL, nil
}

func initMinio() error {
	internalEndpoint := strings.TrimSpace(os.Getenv("MINIO_INTERNAL_ENDPOINT"))
	if internalEndpoint == "" {
		internalEndpoint = strings.TrimSpace(os.Getenv("MINIO_ENDPOINT"))
	}
	if internalEndpoint == "" {
		return errors.New("MINIO_INTERNAL_ENDPOINT is not configured")
	}

	accessKey := strings.TrimSpace(os.Getenv("MINIO_ACCESS_KEY"))
	if accessKey == "" {
		return errors.New("MINIO_ACCESS_KEY is not configured")
	}

	secretKey := strings.TrimSpace(os.Getenv("MINIO_SECRET_KEY"))
	if secretKey == "" {
		return errors.New("MINIO_SECRET_KEY is not configured")
	}

	bucket := strings.TrimSpace(os.Getenv("MINIO_BUCKET"))
	if bucket == "" {
		return errors.New("MINIO_BUCKET is not configured")
	}

	secure := true
	host := internalEndpoint
	if strings.Contains(internalEndpoint, "://") {
		parsed, err := url.Parse(internalEndpoint)
		if err != nil {
			return fmt.Errorf("parse MINIO_INTERNAL_ENDPOINT: %w", err)
		}
		if parsed.Host == "" {
			return errors.New("MINIO_INTERNAL_ENDPOINT must include host")
		}
		host = parsed.Host
		secure = parsed.Scheme != "http"
	} else {
		v := strings.ToLower(strings.TrimSpace(os.Getenv("MINIO_USE_SSL")))
		if v == "false" || v == "0" || v == "" {
			secure = false
		}
	}

	region := strings.TrimSpace(os.Getenv("MINIO_REGION"))

	noProxy := func(*http.Request) (*url.URL, error) { return nil, nil }
	transport := &http.Transport{
		Proxy:                 noProxy,
		DialContext:           (&net.Dialer{Timeout: 5 * time.Second, KeepAlive: 30 * time.Second}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          64,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   5 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}

	opts := &minio.Options{
		Creds:     credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure:    secure,
		Region:    region,
		Transport: transport,
	}

	client, err := minio.New(host, opts)
	if err != nil {
		return fmt.Errorf("init minio client: %w", err)
	}

	presignClient, err := minio.New(host, opts)
	if err != nil {
		return fmt.Errorf("init minio presign client: %w", err)
	}

	ttlMinutes := defaultSignedURLTTLMin
	if rawTTL := strings.TrimSpace(os.Getenv("MINIO_SIGNED_URL_TTL")); rawTTL != "" {
		value, err := strconv.Atoi(rawTTL)
		if err != nil {
			return fmt.Errorf("parse MINIO_SIGNED_URL_TTL: %w", err)
		}
		if value <= 0 {
			return errors.New("MINIO_SIGNED_URL_TTL must be positive")
		}
		ttlMinutes = value
	}

	prefix := strings.Trim(strings.TrimSpace(os.Getenv("MINIO_RESULT_PREFIX")), "/")
	if prefix == "" {
		prefix = defaultResultPrefix
	}

	externalEndpoint := strings.TrimSpace(os.Getenv("MINIO_EXTERNAL_ENDPOINT"))
	if externalEndpoint == "" {
		externalEndpoint = strings.TrimSpace(os.Getenv("MINIO_PUBLIC_ENDPOINT"))
	}
	if externalEndpoint != "" {
		parsed, err := url.Parse(externalEndpoint)
		if err != nil {
			return fmt.Errorf("parse MINIO_EXTERNAL_ENDPOINT: %w", err)
		}
		if parsed.Host == "" {
			return errors.New("MINIO_EXTERNAL_ENDPOINT must include host")
		}
		minioPublicHost = parsed.Host
		minioPublicScheme = parsed.Scheme
	}

	minioClient = client
	minioPresignClient = presignClient
	minioBucket = bucket
	minioResultPrefix = prefix
	minioSignedURLTTL = time.Duration(ttlMinutes) * time.Minute

	return nil
}

func loadRemoteImage(ctx context.Context, uri string) ([]byte, error) {
	if strings.TrimSpace(uri) == "" {
		return nil, errors.New("remote image url is empty")
	}

	parsed, err := url.Parse(uri)
	if err != nil {
		return nil, fmt.Errorf("parse remote image url: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, fmt.Errorf("unsupported remote image scheme: %s", parsed.Scheme)
	}

	if ctx == nil {
		ctx = context.Background()
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, uri, nil)
	if err != nil {
		return nil, fmt.Errorf("create remote image request: %w", err)
	}

	resp, err := remoteHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("download remote image: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("remote image request failed: status %d", resp.StatusCode)
	}

	if resp.ContentLength > 0 && resp.ContentLength > maxRemoteImageSize {
		return nil, fmt.Errorf("remote image too large: %d bytes", resp.ContentLength)
	}

	limited := io.LimitReader(resp.Body, maxRemoteImageSize+1)
	data, err := io.ReadAll(limited)
	if err != nil {
		return nil, fmt.Errorf("read remote image: %w", err)
	}

	if int64(len(data)) > maxRemoteImageSize {
		return nil, fmt.Errorf("remote image exceeds limit (%d bytes)", maxRemoteImageSize)
	}

	return data, nil
}

func loadMinioObject(ctx context.Context, client *minio.Client, bucket, object string) ([]byte, error) {
	if client == nil {
		return nil, errors.New("minio client is nil")
	}
	if ctx == nil {
		ctx = context.Background()
	}

	obj, err := client.GetObject(ctx, bucket, object, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("get minio object: %w", err)
	}
	defer obj.Close()

	info, err := obj.Stat()
	if err != nil {
		return nil, fmt.Errorf("stat minio object: %w", err)
	}
	if info.Size > maxRemoteImageSize {
		return nil, fmt.Errorf("minio object too large: %d bytes", info.Size)
	}

	data, err := io.ReadAll(obj)
	if err != nil {
		return nil, fmt.Errorf("read minio object: %w", err)
	}

	return data, nil
}

func applyPublicEndpoint(u *url.URL) {
	if u == nil {
		return
	}
	if minioPublicHost == "" {
		return
	}
	u.Host = minioPublicHost
	if minioPublicScheme != "" {
		u.Scheme = minioPublicScheme
	}
}

func sanitize(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "preview"
	}

	sanitized := sanitizeRegexp.ReplaceAllString(trimmed, "")
	sanitized = strings.Trim(sanitized, "-_")

	if sanitized == "" {
		sanitized = "preview"
	}

	if len(sanitized) > 64 {
		sanitized = sanitized[:64]
	}

	return sanitized
}

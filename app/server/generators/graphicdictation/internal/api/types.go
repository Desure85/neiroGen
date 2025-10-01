package api

// Status описывает текущий статус задачи генерации.
type Status string

const (
	StatusPending   Status = "pending"
	StatusCompleted Status = "completed"
	StatusFailed    Status = "failed"
)

// Command представляет отдельную инструкцию графического диктанта.
type Command struct {
	Action    string `json:"action"`
	Direction string `json:"direction,omitempty"`
	Steps     int    `json:"steps,omitempty"`
}

// GenerateRequest описывает входной запрос на генерацию графического диктанта.
type GenerateRequest struct {
	JobID               string  `json:"job_id"`
	ShardIndex          int     `json:"shard_index"`
	ShardTotal          int     `json:"shard_total"`
	GridWidth           int     `json:"grid_width"`
	GridHeight          int     `json:"grid_height"`
	CellSizeMM          int     `json:"cell_size_mm"`
	AllowDiagonals      bool    `json:"allow_diagonals"`
	ShapeName           string  `json:"shape_name"`
	Description         string  `json:"description"`
	Difficulty          string  `json:"difficulty"`
	SourceImage         string  `json:"source_image"`
	SourceImageObject   string  `json:"source_image_object"`
	IncludeHoles        bool    `json:"include_holes"`
	ImageThreshold      float64 `json:"image_threshold"`
	ImageBlurRadius     float64 `json:"image_blur_radius"`
	ImageInvert         bool    `json:"image_invert"`
	Simplification      float64 `json:"simplification"`
	Smoothing           int     `json:"smoothing"`
	ImageMinContourArea float64 `json:"image_min_contour_area"`
	ImageMaxContours    int     `json:"image_max_contours"`
	ImageHighResGrid    int     `json:"image_high_res_grid"`
	ImageCannyLow       float32 `json:"image_canny_low"`
	ImageCannyHigh      float32 `json:"image_canny_high"`
	ImageSkeletonize    bool    `json:"image_skeletonize"`
	ImageSingleContour  bool    `json:"image_single_contour"`
}

// GenerateResponse описывает результат генерации путей и предпросмотров.
type GenerateResponse struct {
	JobID           string    `json:"job_id"`
	ShardIndex      int       `json:"shard_index"`
	ShardTotal      int       `json:"shard_total"`
	StartRow        int       `json:"start_row"`
	StartCol        int       `json:"start_col"`
	Commands        []Command `json:"commands"`
	Instructions    string    `json:"instructions"`
	PreviewImageURL string    `json:"preview_image_url"`
	PreviewSVGURL   string    `json:"preview_svg_url"`
}

// JobStatus описывает состояние задачи в API очереди.
type JobStatus struct {
	JobID           string            `json:"job_id"`
	Status          Status            `json:"status"`
	ShardsTotal     int               `json:"shards_total"`
	ShardsCompleted int               `json:"shards_completed"`
	Result          *GenerateResponse `json:"result,omitempty"`
	Error           string            `json:"error,omitempty"`
}

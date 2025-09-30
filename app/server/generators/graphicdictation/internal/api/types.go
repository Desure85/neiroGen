package api

// GenerateRequest describes input parameters for the graphic dictation generator.
// When jobs are sharded, multiple requests with the same JobID are dispatched
// and ShardIndex ranges from 0 to ShardTotal-1.
type GenerateRequest struct {
	JobID          string  `json:"job_id"`
	ShardIndex     int     `json:"shard_index"`
	ShardTotal     int     `json:"shard_total"`
	SourceImage    string  `json:"source_image"`  // Image URL or base64 for contour tracing
	Description    string  `json:"description"`    // Text description of shape to generate
	ShapeName      string  `json:"shape_name"`     // Optional: specific shape name
	GridWidth      int     `json:"grid_width"`
	GridHeight     int     `json:"grid_height"`
	CellSizeMM     int     `json:"cell_size_mm"`
	Difficulty     string  `json:"difficulty"`     // easy, medium, hard
	AllowDiagonals bool    `json:"allow_diagonals"`
	IncludeHoles   bool    `json:"include_holes"`  // Include internal holes in contour
	Simplification float64 `json:"simplification"` // Douglas-Peucker epsilon (0.5-3.0, default 1.5)
	Smoothing      int     `json:"smoothing"`      // Smoothing iterations (0-5, default 0)
	ImageThreshold float64 `json:"image_threshold"`
	ImageBlurRadius float64 `json:"image_blur_radius"`
	ImageInvert    bool    `json:"image_invert"`
}

// Command represents a single drawing instruction.
type Command struct {
	Direction string `json:"direction"`
	Steps     int    `json:"steps,omitempty"`
	TargetRow int    `json:"target_row,omitempty"`
	TargetCol int    `json:"target_col,omitempty"`
}

// GenerateResponse is returned to the caller once dictation is generated.
// Each shard produces a partial response that can be merged on the PHP side.
type GenerateResponse struct {
	JobID           string    `json:"job_id"`
	ShardIndex      int       `json:"shard_index"`
	ShardTotal      int       `json:"shard_total"`
	PreviewImageURL string    `json:"preview_image_url"`
	PreviewSvgURL   string    `json:"preview_svg_url,omitempty"`
	StartRow        int       `json:"start_row"`
	StartCol        int       `json:"start_col"`
	Commands        []Command `json:"commands"`
	Instructions    []string  `json:"instructions"`
}

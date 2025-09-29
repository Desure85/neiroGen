package api

// GenerateRequest describes input parameters for the graphic dictation generator.
// When jobs are sharded, multiple requests with the same JobID are dispatched
// and ShardIndex ranges from 0 to ShardTotal-1.
type GenerateRequest struct {
	JobID          string `json:"job_id"`
	ShardIndex     int    `json:"shard_index"`
	ShardTotal     int    `json:"shard_total"`
	SourceImage    string `json:"source_image"`
	GridWidth      int    `json:"grid_width"`
	GridHeight     int    `json:"grid_height"`
	CellSizeMM     int    `json:"cell_size_mm"`
	Difficulty     string `json:"difficulty"`
	AllowDiagonals bool   `json:"allow_diagonals"`
}

// Command represents a single drawing instruction.
type Command struct {
	Direction string `json:"direction"`
	Steps     int    `json:"steps"`
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

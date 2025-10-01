package api

import "encoding/json"

// Command представляет отдельную инструкцию графического диктанта.
type Command struct {
	Action    string `json:"action"`
	Direction string `json:"direction,omitempty"`
	Steps     int    `json:"steps,omitempty"`
}

// GenerateRequest описывает входной запрос на генерацию графического диктанта.
type GenerateRequest struct {
	JobID           string  `json:"job_id"`
	ShardIndex      int     `json:"shard_index"`
	ShardTotal      int     `json:"shard_total"`
	GridWidth       int     `json:"grid_width"`
	GridHeight      int     `json:"grid_height"`
	CellSizeMM      int     `json:"cell_size_mm"`
	AllowDiagonals  bool    `json:"allow_diagonals"`
	ShapeName       string  `json:"shape_name"`
	Description     string  `json:"description"`
	Difficulty      string  `json:"difficulty"`
	SourceImage     string  `json:"source_image"`
	IncludeHoles    bool    `json:"include_holes"`
	ImageBlurRadius float64 `json:"image_blur_radius"`
	ImageThreshold  float64 `json:"image_threshold"`
	ImageInvert     bool    `json:"image_invert"`
	Simplification  float64 `json:"simplification"`
	Smoothing       int     `json:"smoothing"`
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

// MarshalJSON обеспечивает стабильный порядок полей, если понадобится сериализация вручную.
func (r GenerateResponse) MarshalJSON() ([]byte, error) {
	type alias GenerateResponse
	return json.Marshal(alias(r))
}

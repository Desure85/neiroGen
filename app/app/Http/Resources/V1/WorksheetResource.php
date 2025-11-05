<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class WorksheetResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'title' => $this->title,
            'status' => $this->status,
            'format' => strtoupper($this->format ?? 'A4'),
            'copies' => $this->copies,
            'notes' => $this->notes,
            'fields_snapshot' => $this->fields_snapshot ?? [],
            'meta' => $this->meta ?? [],
            'worksheet_layout_id' => $this->worksheet_layout_id,
            'header_html' => $this->header_html,
            'footer_html' => $this->footer_html,
            'generated_at' => optional($this->generated_at)->toIso8601String(),
            'pdf_path' => $this->pdf_path,
            'child_id' => $this->child_id,
            'items' => WorksheetItemResource::collection($this->whenLoaded('items')),
            'layout' => new WorksheetLayoutResource($this->whenLoaded('layout')),
            'child' => new ChildResource($this->whenLoaded('child')),
            'created_by' => $this->created_by,
            'created_at' => optional($this->created_at)->toIso8601String(),
            'updated_at' => optional($this->updated_at)->toIso8601String(),
        ];
    }
}

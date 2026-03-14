<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorksheetItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'worksheet_id',
        'exercise_id',
        'position',
        'title',
        'instructions',
        'content_snapshot',
        'can_regenerate',
        'last_regenerated_at',
    ];

    protected $casts = [
        'instructions' => 'array',
        'content_snapshot' => 'array',
        'can_regenerate' => 'boolean',
        'last_regenerated_at' => 'datetime',
    ];

    /**
     * Mutator to ensure instructions is always an array.
     */
    public function setInstructionsAttribute($value): void
    {
        if (is_string($value)) {
            $this->attributes['instructions'] = [$value];
        } elseif (is_array($value)) {
            $this->attributes['instructions'] = $value;
        } else {
            $this->attributes['instructions'] = [];
        }
    }

    /**
     * Mutator to ensure content_snapshot is always an array.
     */
    public function setContentSnapshotAttribute($value): void
    {
        if (is_array($value)) {
            $this->attributes['content_snapshot'] = $value;
        } elseif (is_string($value)) {
            try {
                $decoded = json_decode($value, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $this->attributes['content_snapshot'] = $decoded;
                    return;
                }
            } catch (\Exception $e) {
                // Ignore
            }
        }
        $this->attributes['content_snapshot'] = [];
    }

    public function worksheet(): BelongsTo
    {
        return $this->belongsTo(Worksheet::class);
    }

    public function exercise(): BelongsTo
    {
        return $this->belongsTo(Exercise::class);
    }

    public function regenerations(): HasMany
    {
        return $this->hasMany(WorksheetItemRegeneration::class);
    }
}

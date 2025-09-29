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

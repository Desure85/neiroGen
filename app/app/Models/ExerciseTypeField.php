<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExerciseTypeField extends Model
{
    use HasFactory;

    protected $fillable = [
        'exercise_type_id',
        'key',
        'label',
        'field_type',
        'is_required',
        'min_value',
        'max_value',
        'step',
        'default_value',
        'options',
        'help_text',
        'display_order',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'min_value' => 'float',
        'max_value' => 'float',
        'step' => 'float',
        'default_value' => 'array',
        'options' => 'array',
        'display_order' => 'integer',
    ];

    public function exerciseType(): BelongsTo
    {
        return $this->belongsTo(ExerciseType::class);
    }
}

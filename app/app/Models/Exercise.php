<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Exercise extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'content',
        'type',
        'difficulty',
        'estimated_duration',
        'tags',
        'is_active',
        'instructions',
        'custom_params',
        'tenant_id',
        'created_by',
        'exercise_type_id',
    ];

    protected $casts = [
        'content' => 'array',
        'tags' => 'array',
        'is_active' => 'boolean',
        'estimated_duration' => 'integer',
        'instructions' => 'array',
        'custom_params' => 'array',
        'tenant_id' => 'integer',
        'exercise_type_id' => 'integer',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function exerciseType(): BelongsTo
    {
        return $this->belongsTo(ExerciseType::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function contentBlocks(): BelongsToMany
    {
        return $this->belongsToMany(ContentBlock::class, 'exercise_blocks')
            ->withPivot('order', 'settings', 'delay')
            ->withTimestamps()
            ->orderBy('exercise_blocks.order');
    }

    public function childProgress(): HasMany
    {
        return $this->hasMany(ChildProgress::class);
    }

    public function getTotalBlocksAttribute()
    {
        return $this->contentBlocks()->count();
    }

    public function getExerciseStructureAttribute()
    {
        return $this->contentBlocks()->get()->map(function ($block) {
            return [
                'id' => $block->id,
                'type' => $block->type,
                'title' => $block->title,
                'order' => $block->pivot->order,
                'delay' => $block->pivot->delay,
                'settings' => $block->pivot->settings ?? [],
                'display_content' => $block->display_content
            ];
        });
    }

    public function addContentBlock(ContentBlock $block, array $options = [])
    {
        $maxOrder = $this->contentBlocks()->max('order') ?? 0;

        return $this->contentBlocks()->attach($block->id, [
            'order' => $options['order'] ?? $maxOrder + 1,
            'settings' => $options['settings'] ?? [],
            'delay' => $options['delay'] ?? 0
        ]);
    }

    public function reorderBlocks(array $blockOrder)
    {
        foreach ($blockOrder as $order => $blockId) {
            $this->contentBlocks()->updateExistingPivot($blockId, ['order' => $order]);
        }
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChildProgress extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'exercise_id',
        'score',
        'attempts',
        'completed_at',
        'metadata',
    ];

    protected $casts = [
        'completed_at' => 'timestamp',
        'metadata' => 'array',
        'score' => 'integer',
        'attempts' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function exercise(): BelongsTo
    {
        return $this->belongsTo(Exercise::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExerciseSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'child_id',
        'exercise_id',
        'score',
        'completed_items',
        'total_items',
        'time_spent',
        'accuracy',
        'started_at',
        'finished_at',
        'metadata',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function child()
    {
        return $this->belongsTo(Child::class);
    }

    public function exercise()
    {
        return $this->belongsTo(Exercise::class);
    }
}

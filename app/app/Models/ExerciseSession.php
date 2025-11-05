<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ExerciseSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'session_code',
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

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (ExerciseSession $session) {
            if (empty($session->session_code)) {
                $session->session_code = static::generateUniqueSessionCode();
            }
        });
    }

    protected static function generateUniqueSessionCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
        } while (static::where('session_code', $code)->exists());

        return $code;
    }

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

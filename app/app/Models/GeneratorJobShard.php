<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeneratorJobShard extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_id',
        'shard_index',
        'status',
        'payload',
        'result_payload',
        'error',
        'started_at',
        'finished_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'result_payload' => 'array',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function job(): BelongsTo
    {
        return $this->belongsTo(GeneratorJob::class, 'job_id');
    }
}

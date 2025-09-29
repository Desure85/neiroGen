<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeneratorJob extends Model
{
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'user_id',
        'generator',
        'payload',
        'result_payload',
        'status',
        'shards_total',
        'shards_completed',
        'result_path',
        'error',
        'completed_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'result_payload' => 'array',
        'completed_at' => 'datetime',
        'shards_total' => 'integer',
        'shards_completed' => 'integer',
    ];

    public function shards(): HasMany
    {
        return $this->hasMany(GeneratorJobShard::class, 'job_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

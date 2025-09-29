<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ComfyPreset extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'graph',
        'defaults',
        'enabled',
    ];

    protected $casts = [
        'graph' => 'array',
        'defaults' => 'array',
        'enabled' => 'boolean',
    ];
}

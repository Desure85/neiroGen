<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExerciseType extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'name',
        'domain',
        'icon',
        'description',
        'is_active',
        'display_order',
        'meta',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer',
        'meta' => 'array',
    ];

    public function fields(): HasMany
    {
        return $this->hasMany(ExerciseTypeField::class);
    }

    public function exercises(): HasMany
    {
        return $this->hasMany(Exercise::class);
    }
}

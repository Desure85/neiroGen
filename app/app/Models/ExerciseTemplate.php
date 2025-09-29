<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExerciseTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'type',
        'content',
        'tenant_id',
        'created_by',
    ];

    protected $casts = [
        'content' => 'array',
        'tenant_id' => 'integer',
        'created_by' => 'integer',
    ];
}

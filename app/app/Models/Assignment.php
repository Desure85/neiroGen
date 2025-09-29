<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Assignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'child_id',
        'exercise_template_id',
        'created_by',
        'tenant_id',
        'status',
        'due_date',
        'meta',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'created_by' => 'integer',
        'child_id' => 'integer',
        'due_date' => 'date',
        'meta' => 'array',
    ];

    public function template()
    {
        return $this->belongsTo(ExerciseTemplate::class, 'exercise_template_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function child()
    {
        return $this->belongsTo(Child::class, 'child_id');
    }
}

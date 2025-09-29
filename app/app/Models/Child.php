<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Child extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'age',
        'gender',
        'avatar',
        'overall_progress',
        'last_session_at',
        'tenant_id',
        'created_by',
    ];
}

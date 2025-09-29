<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorksheetLayout extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'created_by',
        'name',
        'header_html',
        'footer_html',
        'meta',
        'is_default',
    ];

    protected $casts = [
        'meta' => 'array',
        'is_default' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

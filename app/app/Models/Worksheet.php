<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Worksheet extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'created_by',
        'title',
        'status',
        'format',
        'copies',
        'fields_snapshot',
        'meta',
        'notes',
        'child_id',
        'worksheet_layout_id',
        'header_html',
        'footer_html',
        'generated_at',
        'pdf_path',
    ];

    protected $casts = [
        'fields_snapshot' => 'array',
        'meta' => 'array',
        'generated_at' => 'datetime',
        'copies' => 'integer',
        'worksheet_layout_id' => 'integer',
        'child_id' => 'integer',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(WorksheetItem::class)->orderBy('position');
    }

    public function regenerations(): HasManyThrough
    {
        return $this->hasManyThrough(
            WorksheetItemRegeneration::class,
            WorksheetItem::class
        );
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function layout(): BelongsTo
    {
        return $this->belongsTo(WorksheetLayout::class, 'worksheet_layout_id');
    }

    public function child(): BelongsTo
    {
        return $this->belongsTo(Child::class);
    }
}

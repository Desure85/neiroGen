<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorksheetItemRegeneration extends Model
{
    use HasFactory;

    protected $fillable = [
        'worksheet_item_id',
        'performed_by',
        'status',
        'payload_before',
        'payload_after',
    ];

    protected $casts = [
        'payload_before' => 'array',
        'payload_after' => 'array',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(WorksheetItem::class, 'worksheet_item_id');
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}

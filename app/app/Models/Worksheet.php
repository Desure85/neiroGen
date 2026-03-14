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
        'share_token',
        'share_expires_at',
    ];

    protected $casts = [
        'fields_snapshot' => 'array',
        'meta' => 'array',
        'generated_at' => 'datetime',
        'copies' => 'integer',
        'worksheet_layout_id' => 'integer',
        'child_id' => 'integer',
        'share_expires_at' => 'datetime',
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

    /**
     * Generate a share token for parent access.
     */
    public function generateShareToken(int $daysValid = 30): string
    {
        $token = bin2hex(random_bytes(16));
        $this->update([
            'share_token' => $token,
            'share_expires_at' => now()->addDays($daysValid),
        ]);
        return $token;
    }

    /**
     * Check if share token is valid.
     */
    public function isShareTokenValid(?string $token): bool
    {
        if (!$token || !$this->share_token) {
            return false;
        }
        
        if ($this->share_expires_at && $this->share_expires_at->isPast()) {
            return false;
        }
        
        return hash_equals($this->share_token, $token);
    }

    /**
     * Invalidate share token.
     */
    public function invalidateShareToken(): void
    {
        $this->update([
            'share_token' => null,
            'share_expires_at' => null,
        ]);
    }

    /**
     * Get share URL.
     */
    public function getShareUrl(?string $baseUrl = null): ?string
    {
        if (!$this->share_token || !$this->isShareTokenValid($this->share_token)) {
            return null;
        }
        
        $baseUrl = $baseUrl ?? config('app.frontend_url', config('app.url'));
        return rtrim($baseUrl, '/') . '/worksheet/' . $this->share_token;
    }
}

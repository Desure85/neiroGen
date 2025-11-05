<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\TagUsageStat;

class FileTag extends Model
{
    use HasFactory;

    protected $fillable = [
        'file_id',
        'tag',
        'user_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Файл
     */
    public function file(): BelongsTo
    {
        return $this->belongsTo(File::class);
    }

    /**
     * Пользователь
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * При создании тега обновить статистику
     */
    protected static function booted(): void
    {
        static::created(function (FileTag $fileTag) {
            TagUsageStat::updateUsage($fileTag->user_id, $fileTag->tag);
        });
    }
}

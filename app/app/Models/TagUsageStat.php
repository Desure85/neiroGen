<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TagUsageStat extends Model
{
    use HasFactory;

    protected $fillable = [
        'tag',
        'user_id',
        'usage_count',
        'last_used_at',
    ];

    protected $casts = [
        'usage_count' => 'integer',
        'last_used_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Пользователь
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Обновить статистику использования тега
     */
    public static function updateUsage(int $userId, string $tag): void
    {
        self::updateOrCreate(
            ['user_id' => $userId, 'tag' => $tag],
            [
                'usage_count' => \Illuminate\Support\Facades\DB::raw('usage_count + 1'),
                'last_used_at' => now(),
            ]
        );
    }

    /**
     * Получить популярные теги пользователя
     */
    public static function getPopularTags(int $userId, int $limit = 10): array
    {
        return self::where('user_id', $userId)
            ->orderByDesc('usage_count')
            ->orderByDesc('last_used_at')
            ->limit($limit)
            ->pluck('tag')
            ->toArray();
    }

    /**
     * Поиск тегов
     */
    public static function searchTags(int $userId, string $query, int $limit = 10): array
    {
        return self::where('user_id', $userId)
            ->where('tag', 'ILIKE', "%{$query}%")
            ->orderByDesc('usage_count')
            ->limit($limit)
            ->pluck('tag')
            ->toArray();
    }
}

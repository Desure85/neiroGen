<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class File extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'name',
        'type',
        'parent_id',
        'user_id',
        'mime_type',
        'size',
        'storage_path',
        'url',
        'thumbnail_path',
        'thumbnail_url',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'size' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $appends = ['formatted_size', 'is_image'];

    /**
     * Владелец файла
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Родительская папка
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(File::class, 'parent_id');
    }

    /**
     * Дочерние элементы (файлы и папки внутри папки)
     */
    public function children(): HasMany
    {
        return $this->hasMany(File::class, 'parent_id');
    }

    /**
     * Теги файла
     */
    public function fileTags(): HasMany
    {
        return $this->hasMany(FileTag::class);
    }

    /**
     * Получить массив тегов
     */
    public function getTagsAttribute(): array
    {
        return $this->fileTags()->pluck('tag')->toArray();
    }

    /**
     * Форматированный размер файла
     */
    public function getFormattedSizeAttribute(): ?string
    {
        if ($this->type === 'folder' || !$this->size) {
            return null;
        }

        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = $this->size;
        $i = 0;

        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }

        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * Является ли файл изображением
     */
    public function getIsImageAttribute(): bool
    {
        return $this->mime_type && str_starts_with($this->mime_type, 'image/');
    }

    /**
     * Scope: только файлы
     */
    public function scopeFiles($query)
    {
        return $query->where('type', 'file');
    }

    /**
     * Scope: только папки
     */
    public function scopeFolders($query)
    {
        return $query->where('type', 'folder');
    }

    /**
     * Scope: корневые элементы (без родителя)
     */
    public function scopeRoot($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Scope: по тегу
     */
    public function scopeWithTag($query, string $tag)
    {
        return $query->whereHas('fileTags', function ($q) use ($tag) {
            $q->where('tag', $tag);
        });
    }

    /**
     * Удалить файл из MinIO при удалении записи
     */
    protected static function booted(): void
    {
        static::deleting(function (File $file) {
            if ($file->type === 'file' && $file->storage_path) {
                // Удалить основной файл
                Storage::disk('minio')->delete($file->storage_path);
                
                // Удалить thumbnail если есть
                if ($file->thumbnail_path) {
                    Storage::disk('minio')->delete($file->thumbnail_path);
                }
            }
            
            // Удалить теги
            $file->fileTags()->delete();
        });
    }

    /**
     * Получить путь для хранения в MinIO
     */
    public static function generateStoragePath(int $userId, string $originalName): string
    {
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        $filename = uniqid() . '_' . time();
        
        return "users/{$userId}/files/{$filename}.{$extension}";
    }

    /**
     * Получить путь для thumbnail
     */
    public static function generateThumbnailPath(string $storagePath): string
    {
        $pathInfo = pathinfo($storagePath);
        return $pathInfo['dirname'] . '/thumbnails/' . $pathInfo['filename'] . '_thumb.' . $pathInfo['extension'];
    }
}

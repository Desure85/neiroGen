<?php

namespace App\Services;

use App\Models\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class FileStorageService
{
    /**
     * Загрузить файл в MinIO
     */
    public function uploadFile(UploadedFile $file, int $userId, ?string $parentId = null): File
    {
        // Генерировать путь в MinIO
        $storagePath = File::generateStoragePath($userId, $file->getClientOriginalName());
        
        // Загрузить файл в MinIO
        Storage::disk('minio')->putFileAs(
            dirname($storagePath),
            $file,
            basename($storagePath),
            'public'
        );
        
        // Получить публичный URL
        $url = Storage::disk('minio')->url($storagePath);
        
        // Создать thumbnail для изображений
        $thumbnailPath = null;
        $thumbnailUrl = null;
        
        if (str_starts_with($file->getMimeType(), 'image/')) {
            [$thumbnailPath, $thumbnailUrl] = $this->createThumbnail($file, $storagePath);
        }
        
        // Сохранить запись в БД
        return File::create([
            'name' => $file->getClientOriginalName(),
            'type' => 'file',
            'parent_id' => $parentId,
            'user_id' => $userId,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'storage_path' => $storagePath,
            'url' => $url,
            'thumbnail_path' => $thumbnailPath,
            'thumbnail_url' => $thumbnailUrl,
        ]);
    }

    /**
     * Создать thumbnail для изображения
     * TODO: Установить intervention/image для генерации thumbnail
     */
    private function createThumbnail(UploadedFile $file, string $storagePath): array
    {
        try {
            // TODO: Раскомментировать после установки intervention/image
            // composer require intervention/image
            /*
            $thumbnail = Image::make($file->getRealPath())
                ->fit(250, 200, function ($constraint) {
                    $constraint->upsize();
                });
            
            $tempPath = sys_get_temp_dir() . '/' . uniqid() . '.jpg';
            $thumbnail->save($tempPath, 80, 'jpg');
            
            $thumbnailPath = File::generateThumbnailPath($storagePath);
            
            Storage::disk('minio')->put(
                $thumbnailPath,
                file_get_contents($tempPath),
                'public'
            );
            
            @unlink($tempPath);
            
            $thumbnailUrl = Storage::disk('minio')->url($thumbnailPath);
            
            return [$thumbnailPath, $thumbnailUrl];
            */
            
            // Временно без thumbnail
            return [null, null];
        } catch (\Exception $e) {
            Log::error('Failed to create thumbnail', [
                'error' => $e->getMessage(),
                'storage_path' => $storagePath,
            ]);
            
            return [null, null];
        }
    }

    /**
     * Создать папку
     */
    public function createFolder(string $name, int $userId, ?string $parentId = null): File
    {
        return File::create([
            'name' => $name,
            'type' => 'folder',
            'parent_id' => $parentId,
            'user_id' => $userId,
        ]);
    }

    /**
     * Удалить файл или папку
     */
    public function deleteFile(File $file): bool
    {
        // Если это папка, рекурсивно удалить содержимое
        if ($file->type === 'folder') {
            foreach ($file->children as $child) {
                $this->deleteFile($child);
            }
        }
        
        return $file->delete();
    }

    /**
     * Переместить файл/папку
     */
    public function moveFile(File $file, ?string $newParentId): bool
    {
        // Проверить что не перемещаем папку в саму себя или в дочернюю
        if ($newParentId && $this->isDescendant($file->id, $newParentId)) {
            throw new \InvalidArgumentException('Cannot move folder into itself or its descendant');
        }
        
        $file->parent_id = $newParentId;
        return $file->save();
    }

    /**
     * Проверить является ли targetId потомком folderId
     */
    private function isDescendant(string $folderId, string $targetId): bool
    {
        $current = File::find($targetId);
        
        while ($current && $current->parent_id) {
            if ($current->parent_id === $folderId) {
                return true;
            }
            $current = $current->parent;
        }
        
        return false;
    }

    /**
     * Переименовать файл/папку
     */
    public function renameFile(File $file, string $newName): bool
    {
        $file->name = $newName;
        return $file->save();
    }

    /**
     * Получить размер папки (рекурсивно)
     */
    public function getFolderSize(File $folder): int
    {
        if ($folder->type !== 'folder') {
            return $folder->size ?? 0;
        }
        
        $size = 0;
        foreach ($folder->children as $child) {
            $size += $this->getFolderSize($child);
        }
        
        return $size;
    }

    /**
     * Получить дерево файлов
     */
    public function getFileTree(int $userId, ?string $parentId = null): array
    {
        $query = File::where('user_id', $userId);
        
        if ($parentId) {
            $query->where('parent_id', $parentId);
        } else {
            $query->whereNull('parent_id');
        }
        
        $files = $query->with(['fileTags'])->orderBy('type', 'desc')->orderBy('name')->get();
        
        return $files->map(function ($file) use ($userId) {
            $data = $file->toArray();
            $data['tags'] = $file->fileTags->pluck('tag')->toArray();
            
            // Рекурсивно получить детей если это папка
            if ($file->type === 'folder') {
                $data['children'] = $this->getFileTree($userId, $file->id);
            }
            
            return $data;
        })->toArray();
    }
}

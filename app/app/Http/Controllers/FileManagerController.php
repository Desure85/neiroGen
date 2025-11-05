<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateFolderRequest;
use App\Http\Requests\UploadFileRequest;
use App\Models\File;
use App\Models\FileTag;
use App\Models\TagUsageStat;
use App\Services\FileStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FileManagerController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    /**
     * Получить список файлов и папок
     * 
     * GET /api/files
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $parentId = $request->query('parent_id');
        $search = $request->query('search');
        $tags = $request->query('tags'); // comma-separated
        
        $query = File::where('user_id', $userId);
        
        // Фильтр по родителю
        if ($parentId) {
            $query->where('parent_id', $parentId);
        } else {
            $query->whereNull('parent_id');
        }
        
        // Поиск по имени
        if ($search) {
            $query->where('name', 'ILIKE', "%{$search}%");
        }
        
        // Фильтр по тегам
        if ($tags) {
            $tagArray = explode(',', $tags);
            foreach ($tagArray as $tag) {
                $query->withTag(trim($tag));
            }
        }
        
        $files = $query->with(['fileTags'])
            ->orderBy('type', 'desc') // папки first
            ->orderBy('name')
            ->get();
        
        // Добавить теги в формате массива
        $files->each(function ($file) {
            $file->tags = $file->fileTags->pluck('tag')->toArray();
            unset($file->fileTags);
        });
        
        return response()->json([
            'data' => $files,
        ]);
    }

    /**
     * Получить дерево файлов
     * 
     * GET /api/files/tree
     */
    public function tree(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $tree = $this->fileStorageService->getFileTree($userId);
        
        return response()->json([
            'data' => $tree,
        ]);
    }

    /**
     * Создать папку
     * 
     * POST /api/files/folders
     */
    public function createFolder(CreateFolderRequest $request): JsonResponse
    {
        $userId = $request->user()->id;
        
        $folder = $this->fileStorageService->createFolder(
            $request->validated('name'),
            $userId,
            $request->validated('parent_id')
        );
        
        return response()->json([
            'data' => $folder,
        ], 201);
    }

    /**
     * Загрузить файл
     * 
     * POST /api/files/upload
     */
    public function upload(UploadFileRequest $request): JsonResponse
    {
        $userId = $request->user()->id;
        
        $files = [];
        foreach ($request->file('files') as $uploadedFile) {
            $file = $this->fileStorageService->uploadFile(
                $uploadedFile,
                $userId,
                $request->validated('parent_id')
            );
            
            $files[] = $file;
        }
        
        return response()->json([
            'data' => $files,
        ], 201);
    }

    /**
     * Удалить файл/папку
     * 
     * DELETE /api/files/{id}
     */
    public function destroy(string $id, Request $request): JsonResponse
    {
        $file = File::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();
        
        $this->fileStorageService->deleteFile($file);
        
        return response()->json(null, 204);
    }

    /**
     * Переместить файл/папку
     * 
     * PATCH /api/files/{id}/move
     */
    public function move(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'parent_id' => 'nullable|uuid|exists:files,id',
        ]);
        
        $file = File::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();
        
        $this->fileStorageService->moveFile($file, $request->input('parent_id'));
        
        return response()->json([
            'data' => $file->fresh(),
        ]);
    }

    /**
     * Переименовать файл/папку
     * 
     * PATCH /api/files/{id}/rename
     */
    public function rename(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);
        
        $file = File::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();
        
        $this->fileStorageService->renameFile($file, $request->input('name'));
        
        return response()->json([
            'data' => $file->fresh(),
        ]);
    }

    /**
     * Добавить тег
     * 
     * POST /api/files/{id}/tags
     */
    public function addTag(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'tag' => 'required|string|max:100',
        ]);
        
        $file = File::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();
        
        $tag = FileTag::firstOrCreate([
            'file_id' => $file->id,
            'tag' => trim($request->input('tag')),
            'user_id' => $request->user()->id,
        ]);
        
        return response()->json([
            'data' => $tag,
        ], 201);
    }

    /**
     * Удалить тег
     * 
     * DELETE /api/files/{id}/tags/{tag}
     */
    public function removeTag(string $id, string $tag, Request $request): JsonResponse
    {
        $file = File::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();
        
        FileTag::where('file_id', $file->id)
            ->where('tag', urldecode($tag))
            ->delete();
        
        return response()->json(null, 204);
    }

    /**
     * Получить популярные теги
     * 
     * GET /api/files/tags/popular
     */
    public function popularTags(Request $request): JsonResponse
    {
        $limit = $request->query('limit', 10);
        $tags = TagUsageStat::getPopularTags($request->user()->id, $limit);
        
        return response()->json([
            'data' => $tags,
        ]);
    }

    /**
     * Поиск тегов
     * 
     * GET /api/files/tags/search
     */
    public function searchTags(Request $request): JsonResponse
    {
        $query = $request->query('q', '');
        $limit = $request->query('limit', 10);
        
        $tags = TagUsageStat::searchTags($request->user()->id, $query, $limit);
        
        return response()->json([
            'data' => $tags,
        ]);
    }

    /**
     * Получить все теги пользователя
     * 
     * GET /api/files/tags
     */
    public function allTags(Request $request): JsonResponse
    {
        $tags = FileTag::where('user_id', $request->user()->id)
            ->distinct('tag')
            ->orderBy('tag')
            ->pluck('tag');
        
        return response()->json([
            'data' => $tags,
        ]);
    }
}

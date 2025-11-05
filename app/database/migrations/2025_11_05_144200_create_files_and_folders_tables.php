<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Таблица для файлов и папок
        Schema::create('files', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->enum('type', ['file', 'folder'])->default('file');
            $table->uuid('parent_id')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            
            // Для файлов
            $table->string('mime_type')->nullable();
            $table->bigInteger('size')->nullable(); // в байтах
            $table->string('storage_path')->nullable(); // путь в MinIO
            $table->string('url')->nullable(); // публичный URL
            $table->string('thumbnail_path')->nullable(); // путь к thumbnail в MinIO
            $table->string('thumbnail_url')->nullable();
            
            // Метаданные
            $table->json('metadata')->nullable(); // дополнительные данные
            $table->timestamps();
            $table->softDeletes(); // для корзины
            
            // Индексы
            $table->index('parent_id');
            $table->index('user_id');
            $table->index('type');
            $table->index(['user_id', 'parent_id']);
            
            // Foreign key
            $table->foreign('parent_id')
                  ->references('id')
                  ->on('files')
                  ->onDelete('cascade');
        });
        
        // Таблица для тегов файлов
        Schema::create('file_tags', function (Blueprint $table) {
            $table->id();
            $table->uuid('file_id');
            $table->string('tag', 100);
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            
            // Уникальность: один файл не может иметь одинаковые теги
            $table->unique(['file_id', 'tag']);
            
            // Индексы для быстрого поиска
            $table->index('tag');
            $table->index('user_id');
            $table->index(['user_id', 'tag']);
            
            // Foreign key
            $table->foreign('file_id')
                  ->references('id')
                  ->on('files')
                  ->onDelete('cascade');
        });
        
        // Таблица для отслеживания популярности тегов
        Schema::create('tag_usage_stats', function (Blueprint $table) {
            $table->id();
            $table->string('tag', 100);
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->integer('usage_count')->default(0);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
            
            $table->unique(['tag', 'user_id']);
            $table->index(['user_id', 'usage_count']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tag_usage_stats');
        Schema::dropIfExists('file_tags');
        Schema::dropIfExists('files');
    }
};

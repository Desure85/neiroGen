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
        Schema::create('content_blocks', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['text', 'image', 'audio', 'video', 'interactive', 'drawing', 'choice', 'sequence']);
            $table->string('title');
            $table->json('content'); // Flexible content structure
            $table->json('metadata')->nullable(); // Additional data
            $table->json('settings')->nullable(); // Display settings
            $table->boolean('is_template')->default(false);
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->index(['type', 'is_template']);
            $table->index('created_by');
        });

        Schema::create('exercise_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exercise_id')->constrained()->onDelete('cascade');
            $table->foreignId('content_block_id')->constrained()->onDelete('cascade');
            $table->integer('order')->default(0);
            $table->json('settings')->nullable(); // Override block settings for this exercise
            $table->integer('delay')->default(0); // Delay in seconds before showing
            $table->timestamps();

            $table->unique(['exercise_id', 'content_block_id']);
            $table->index(['exercise_id', 'order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exercise_blocks');
        Schema::dropIfExists('content_blocks');
    }
};

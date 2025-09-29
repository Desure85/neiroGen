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
        Schema::create('exercises', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('content'); // JSON structure for exercise data
            $table->enum('type', ['pronunciation', 'articulation', 'rhythm', 'memory', 'other']);
            $table->enum('difficulty', ['easy', 'medium', 'hard']);
            $table->integer('estimated_duration')->comment('Duration in minutes');
            $table->json('tags')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('child_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('exercise_id')->constrained()->onDelete('cascade');
            $table->integer('score')->default(0);
            $table->integer('attempts')->default(0);
            $table->integer('completed_at')->nullable();
            $table->json('metadata')->nullable(); // Additional progress data
            $table->timestamps();

            $table->unique(['user_id', 'exercise_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('child_progress');
        Schema::dropIfExists('exercises');
    }
};

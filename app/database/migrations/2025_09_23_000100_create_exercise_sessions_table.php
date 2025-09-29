<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exercise_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('child_id')->constrained('children')->cascadeOnDelete();
            $table->foreignId('exercise_id')->nullable()->constrained('exercises')->nullOnDelete();
            $table->unsignedInteger('score')->default(0);
            $table->unsignedInteger('completed_items')->default(0);
            $table->unsignedInteger('total_items')->default(0);
            $table->unsignedInteger('time_spent')->default(0); // seconds
            $table->unsignedInteger('accuracy')->default(0);   // percent 0..100
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exercise_sessions');
    }
};

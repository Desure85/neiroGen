<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exercise_types', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->string('domain')->nullable();
            $table->string('icon', 32)->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('display_order')->default(0);
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('exercise_type_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exercise_type_id')->constrained('exercise_types')->cascadeOnDelete();
            $table->string('key');
            $table->string('label');
            $table->string('field_type');
            $table->boolean('is_required')->default(false);
            $table->double('min_value')->nullable();
            $table->double('max_value')->nullable();
            $table->double('step')->nullable();
            $table->json('default_value')->nullable();
            $table->json('options')->nullable();
            $table->text('help_text')->nullable();
            $table->integer('display_order')->default(0);
            $table->timestamps();

            $table->unique(['exercise_type_id', 'key']);
        });

        // Удаляем старый CHECK-констрейнт, если ещё существует
        DB::statement('ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_type_check');

        Schema::table('exercises', function (Blueprint $table) {
            if (! Schema::hasColumn('exercises', 'exercise_type_id')) {
                $table->foreignId('exercise_type_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('exercise_types')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('exercises', function (Blueprint $table) {
            if (Schema::hasColumn('exercises', 'exercise_type_id')) {
                $table->dropConstrainedForeignId('exercise_type_id');
            }
        });

        Schema::dropIfExists('exercise_type_fields');
        Schema::dropIfExists('exercise_types');
    }
};

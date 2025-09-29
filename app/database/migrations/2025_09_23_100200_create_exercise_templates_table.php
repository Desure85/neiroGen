<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exercise_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('type'); // e.g. pronunciation, articulation, etc.
            $table->json('content'); // JSON schema/params for generating exercises
            // Keep tenant_id but avoid FK to allow flexible migration order; index for queries
            $table->unsignedBigInteger('tenant_id')->nullable(); // null = global template
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exercise_templates');
    }
};

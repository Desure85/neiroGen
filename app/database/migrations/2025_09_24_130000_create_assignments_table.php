<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assignments', function (Blueprint $table) {
            $table->id();
            // Links
            $table->unsignedBigInteger('child_id')->nullable()->index(); // optional FK to children (not enforced here)
            $table->foreignId('exercise_template_id')->constrained('exercise_templates')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            // Multitenancy
            $table->unsignedBigInteger('tenant_id')->nullable()->index();
            // Domain fields
            $table->string('status')->default('pending')->index(); // pending|in_progress|completed|cancelled
            $table->date('due_date')->nullable()->index();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignments');
    }
};

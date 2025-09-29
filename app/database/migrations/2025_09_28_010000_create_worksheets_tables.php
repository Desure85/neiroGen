<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('worksheets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->string('status')->default('draft');
            $table->string('format')->default('A4');
            $table->unsignedTinyInteger('copies')->default(1);
            $table->json('fields_snapshot')->nullable();
            $table->json('meta')->nullable();
            $table->string('notes')->nullable();
            $table->timestamp('generated_at')->nullable();
            $table->string('pdf_path')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status'], 'worksheets_tenant_status_index');
            $table->index(['tenant_id', 'created_at'], 'worksheets_tenant_created_index');
        });

        Schema::create('worksheet_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('worksheet_id')->constrained('worksheets')->cascadeOnDelete();
            $table->foreignId('exercise_id')->nullable()->constrained('exercises')->nullOnDelete();
            $table->unsignedInteger('position');
            $table->string('title');
            $table->json('instructions')->nullable();
            $table->json('content_snapshot');
            $table->boolean('can_regenerate')->default(false);
            $table->timestamp('last_regenerated_at')->nullable();
            $table->timestamps();

            $table->index(['worksheet_id', 'position'], 'worksheet_items_position_index');
        });

        Schema::create('worksheet_item_regenerations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('worksheet_item_id')->constrained('worksheet_items')->cascadeOnDelete();
            $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('completed');
            $table->json('payload_before')->nullable();
            $table->json('payload_after')->nullable();
            $table->timestamps();
        });

        Schema::create('worksheet_presets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->json('fields');
            $table->timestamps();

            $table->unique(['tenant_id', 'name'], 'worksheet_presets_tenant_name_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('worksheet_presets');
        Schema::dropIfExists('worksheet_item_regenerations');
        Schema::dropIfExists('worksheet_items');
        Schema::dropIfExists('worksheets');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('generator_jobs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('generator', 100);
            $table->json('payload');
            $table->json('result_payload')->nullable();
            $table->string('status', 32)->default('pending');
            $table->unsignedInteger('shards_total')->default(1);
            $table->unsignedInteger('shards_completed')->default(0);
            $table->string('result_path')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['generator', 'status']);
            $table->index('created_at');
        });

        Schema::create('generator_job_shards', function (Blueprint $table) {
            $table->id();
            $table->uuid('job_id');
            $table->unsignedInteger('shard_index');
            $table->string('status', 32)->default('pending');
            $table->json('payload')->nullable();
            $table->json('result_payload')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->unique(['job_id', 'shard_index']);
            $table->foreign('job_id')->references('id')->on('generator_jobs')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('generator_job_shards');
        Schema::dropIfExists('generator_jobs');
    }
};

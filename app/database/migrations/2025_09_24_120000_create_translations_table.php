<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('translations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->string('namespace')->nullable();
            $table->string('key');
            $table->string('locale', 8);
            $table->text('value');
            $table->timestamps();

            $table->unique(['tenant_id', 'namespace', 'key', 'locale'], 'translations_unique');
            $table->foreign('tenant_id')->references('id')->on('tenants')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('translations');
    }
};

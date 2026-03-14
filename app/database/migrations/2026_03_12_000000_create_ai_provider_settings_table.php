<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_provider_settings', function (Blueprint $table) {
            $table->id();
            $table->string('provider'); // openai, anthropic, google
            $table->string('api_key')->nullable(); // encrypted via model's casts
            $table->string('model')->nullable();
            $table->boolean('enabled')->default(false);
            $table->json('settings')->nullable(); // additional provider-specific settings
            $table->timestamps();
            
            $table->unique('provider');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_provider_settings');
    }
};

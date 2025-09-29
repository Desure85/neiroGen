<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('worksheet_layouts', function (Blueprint $table) {
            $table->boolean('is_default')->default(false)->after('meta');
            $table->index(['tenant_id', 'is_default'], 'worksheet_layouts_tenant_default_index');
        });

        Schema::table('worksheet_presets', function (Blueprint $table) {
            $table->boolean('is_default')->default(false)->after('fields');
            $table->index(['tenant_id', 'is_default'], 'worksheet_presets_tenant_default_index');
        });
    }

    public function down(): void
    {
        Schema::table('worksheet_layouts', function (Blueprint $table) {
            $table->dropIndex('worksheet_layouts_tenant_default_index');
            $table->dropColumn('is_default');
        });

        Schema::table('worksheet_presets', function (Blueprint $table) {
            $table->dropIndex('worksheet_presets_tenant_default_index');
            $table->dropColumn('is_default');
        });
    }
};

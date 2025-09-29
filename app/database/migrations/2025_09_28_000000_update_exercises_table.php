<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exercises', function (Blueprint $table) {
            if (! Schema::hasColumn('exercises', 'instructions')) {
                $table->json('instructions')->nullable()->after('content');
            }

            if (! Schema::hasColumn('exercises', 'custom_params')) {
                $table->json('custom_params')->nullable()->after('instructions');
            }
        });

        $this->ensureIndex('exercises_tenant_type_index', function () {
            Schema::table('exercises', function (Blueprint $table) {
                $table->index(['tenant_id', 'type'], 'exercises_tenant_type_index');
            });
        });

        $this->ensureIndex('exercises_tenant_difficulty_index', function () {
            Schema::table('exercises', function (Blueprint $table) {
                $table->index(['tenant_id', 'difficulty'], 'exercises_tenant_difficulty_index');
            });
        });

        $this->ensureIndex('exercises_tenant_active_index', function () {
            Schema::table('exercises', function (Blueprint $table) {
                $table->index(['tenant_id', 'is_active'], 'exercises_tenant_active_index');
            });
        });
    }

    public function down(): void
    {
        $this->dropIndexIfExists('exercises_tenant_type_index');
        $this->dropIndexIfExists('exercises_tenant_difficulty_index');
        $this->dropIndexIfExists('exercises_tenant_active_index');

        Schema::table('exercises', function (Blueprint $table) {
            if (Schema::hasColumn('exercises', 'instructions')) {
                $table->dropColumn('instructions');
            }

            if (Schema::hasColumn('exercises', 'custom_params')) {
                $table->dropColumn('custom_params');
            }
        });
    }

    private function ensureIndex(string $indexName, callable $callback): void
    {
        if (! $this->indexExists($indexName)) {
            $callback();
        }
    }

    private function dropIndexIfExists(string $indexName): void
    {
        if ($this->indexExists($indexName)) {
            Schema::table('exercises', function (Blueprint $table) use ($indexName) {
                $table->dropIndex($indexName);
            });
        }
    }

    private function indexExists(string $indexName): bool
    {
        $result = DB::selectOne("SELECT to_regclass('public.".$indexName."') as idx");

        return $result !== null && $result->idx !== null;
    }
};

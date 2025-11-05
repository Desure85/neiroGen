<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // users: tenant_id + role
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'tenant_id')) {
                $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete()->after('id');
            }
            if (! Schema::hasColumn('users', 'role')) {
                $table->enum('role', ['admin', 'teacher'])->default('teacher')->after('tenant_id');
            }
        });

        // children: tenant_id + created_by
        Schema::table('children', function (Blueprint $table) {
            if (! Schema::hasColumn('children', 'tenant_id')) {
                $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete()->after('id');
            }
            if (! Schema::hasColumn('children', 'created_by')) {
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->after('tenant_id');
            }
        });

        // exercises: tenant_id + created_by
        if (Schema::hasTable('exercises')) {
            Schema::table('exercises', function (Blueprint $table) {
                if (! Schema::hasColumn('exercises', 'tenant_id')) {
                    $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete()->after('id');
                }
                if (! Schema::hasColumn('exercises', 'created_by')) {
                    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->after('tenant_id');
                }
                $table->index(['tenant_id', 'created_by']);
            });
        }

        // content_blocks: ensure tenant_id exists (created_by уже есть)
        if (Schema::hasTable('content_blocks')) {
            Schema::table('content_blocks', function (Blueprint $table) {
                if (! Schema::hasColumn('content_blocks', 'tenant_id')) {
                    $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete()->after('id');
                }
                $table->index(['tenant_id']);
            });
        }

        // exercise_sessions: tenant_id
        if (Schema::hasTable('exercise_sessions')) {
            Schema::table('exercise_sessions', function (Blueprint $table) {
                if (! Schema::hasColumn('exercise_sessions', 'tenant_id')) {
                    $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete()->after('id');
                }
                $table->index(['tenant_id']);
            });
        }
    }

    public function down(): void
    {
        // Drop added columns safely
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'role')) {
                $table->dropColumn('role');
            }
            if (Schema::hasColumn('users', 'tenant_id')) {
                $table->dropForeign(['tenant_id']);
                $table->dropColumn('tenant_id');
            }
        });
        Schema::table('children', function (Blueprint $table) {
            if (Schema::hasColumn('children', 'created_by')) {
                $table->dropForeign(['created_by']);
                $table->dropColumn('created_by');
            }
            if (Schema::hasColumn('children', 'tenant_id')) {
                $table->dropForeign(['tenant_id']);
                $table->dropColumn('tenant_id');
            }
        });
        if (Schema::hasTable('exercises')) {
            Schema::table('exercises', function (Blueprint $table) {
                if (Schema::hasColumn('exercises', 'created_by')) {
                    $table->dropForeign(['created_by']);
                    $table->dropColumn('created_by');
                }
                if (Schema::hasColumn('exercises', 'tenant_id')) {
                    $table->dropForeign(['tenant_id']);
                    $table->dropColumn('tenant_id');
                }
            });
        }
        if (Schema::hasTable('content_blocks')) {
            Schema::table('content_blocks', function (Blueprint $table) {
                if (Schema::hasColumn('content_blocks', 'tenant_id')) {
                    $table->dropForeign(['tenant_id']);
                    $table->dropColumn('tenant_id');
                }
            });
        }
        if (Schema::hasTable('exercise_sessions')) {
            Schema::table('exercise_sessions', function (Blueprint $table) {
                if (Schema::hasColumn('exercise_sessions', 'tenant_id')) {
                    $table->dropForeign(['tenant_id']);
                    $table->dropColumn('tenant_id');
                }
            });
        }
    }
};

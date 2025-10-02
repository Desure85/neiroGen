<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exercise_sessions', function (Blueprint $table) {
            if (!Schema::hasColumn('exercise_sessions', 'session_code')) {
                $table->string('session_code', 16)->unique()->nullable()->after('id');
                $table->index('session_code');
            }
        });
    }

    public function down(): void
    {
        Schema::table('exercise_sessions', function (Blueprint $table) {
            if (Schema::hasColumn('exercise_sessions', 'session_code')) {
                $table->dropIndex(['session_code']);
                $table->dropColumn('session_code');
            }
        });
    }
};

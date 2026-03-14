<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('children', function (Blueprint $table) {
            // Gamification fields
            $table->integer('xp')->default(0)->after('overall_progress');
            $table->integer('level')->default(1)->after('xp');
            $table->integer('streak_days')->default(0)->after('level');
            $table->date('last_activity_date')->nullable()->after('streak_days');
            $table->integer('total_exercises_completed')->default(0)->after('last_activity_date');
            $table->integer('total_time_spent')->default(0)->after('total_exercises_completed'); // in seconds
            $table->string('avatar_theme')->default('default')->after('avatar');
            $table->json('unlocked_achievements')->nullable()->after('avatar_theme');
            $table->json('rewards')->nullable()->after('unlocked_achievements');
        });
    }

    public function down(): void
    {
        Schema::table('children', function (Blueprint $table) {
            $table->dropColumn([
                'xp',
                'level',
                'streak_days',
                'last_activity_date',
                'total_exercises_completed',
                'total_time_spent',
                'avatar_theme',
                'unlocked_achievements',
                'rewards',
            ]);
        });
    }
};

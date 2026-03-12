<?php

namespace App\Providers;

use App\Models\ExerciseType;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Cache;

class CacheServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        $this->registerCachemacros();
    }

    /**
     * Register custom cache macros.
     */
    protected function registerCacheMacros(): void
    {
        // Cache helper for exercise types
        Cache::macro('rememberExerciseTypes', function (int $ttl = 3600) {
            return Cache::remember('exercise_types:all', $ttl, function () {
                return ExerciseType::with('fields')->get();
            });
        });

        // Cache helper for single exercise type
        Cache::macro('rememberExerciseType', function (int $id, int $ttl = 3600) {
            return Cache::remember("exercise_types:{$id}", $ttl, function () use ($id) {
                return ExerciseType::with('fields')->find($id);
            });
        });

        // Cache helper for exercise type by key
        Cache::macro('rememberExerciseTypeByKey', function (string $key, int $ttl = 3600) {
            return Cache::remember("exercise_types:key:{$key}", $ttl, function () use ($key) {
                return ExerciseType::with('fields')->where('key', $key)->first();
            });
        });
    }
}

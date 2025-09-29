<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Factories\ExerciseContentFactory;
use App\Services\ExerciseGeneratorService;
use App\Services\AdaptiveExerciseService;
use App\Services\ContentBlockService;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(ExerciseGeneratorService::class);
        $this->app->singleton(AdaptiveExerciseService::class);
        $this->app->singleton(ContentBlockService::class);
        $this->app->singleton(ExerciseContentFactory::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}

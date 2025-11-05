<?php

namespace App\Providers;

use App\Models\Assignment;
use App\Models\Child;
use App\Models\ContentBlock;
use App\Models\ExerciseTemplate;
use App\Policies\AssignmentPolicy;
use App\Policies\ChildPolicy;
use App\Policies\ContentBlockPolicy;
use App\Policies\ExerciseTemplatePolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Assignment::class => AssignmentPolicy::class,
        ExerciseTemplate::class => ExerciseTemplatePolicy::class,
        ContentBlock::class => ContentBlockPolicy::class,
        Child::class => ChildPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();
    }
}

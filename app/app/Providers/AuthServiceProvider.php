<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use App\Models\Assignment;
use App\Models\ExerciseTemplate;
use App\Models\ContentBlock;
use App\Models\Child;
use App\Policies\AssignmentPolicy;
use App\Policies\ExerciseTemplatePolicy;
use App\Policies\ContentBlockPolicy;
use App\Policies\ChildPolicy;

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

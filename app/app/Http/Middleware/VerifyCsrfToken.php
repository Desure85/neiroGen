<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF verification.
     */
    protected $except = [
        // Allow Sanctum to issue CSRF cookies.
        'sanctum/csrf-cookie',
        // Disable CSRF for auth routes in development environment
        'api/auth/login',
        'api/auth/register',
    ];

    /**
     * Handle an incoming request.
     *
     * Override to disable CSRF in local/development environment.
     */
    public function handle($request, \Closure $next)
    {
        // Disable CSRF protection in local/development environment
        if (app()->environment(['local', 'development'])) {
            return $next($request);
        }

        return parent::handle($request, $next);
    }
}

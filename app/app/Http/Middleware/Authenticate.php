<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as BaseAuthenticate;
use Illuminate\Http\Request;

class Authenticate extends BaseAuthenticate
{
    /**
     * Override redirect to ensure API returns 401 JSON instead of redirecting to 'login' route.
     */
    protected function redirectTo($request): ?string
    {
        // For any request (API or otherwise) without Accept: application/json, still avoid redirect loops
        // Returning null makes Laravel respond with 401 for unauthenticated requests
        return null;
    }
}

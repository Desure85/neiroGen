<?php

namespace App\Policies;

use App\Models\ContentBlock;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ContentBlockPolicy
{
    use HandlesAuthorization;

    public function before(User $user, string $ability): ?bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->tenant_id !== null;
    }

    public function view(User $user, ContentBlock $block): bool
    {
        return $block->tenant_id === $user->tenant_id;
    }

    public function create(User $user): bool
    {
        return $user->tenant_id !== null;
    }

    public function update(User $user, ContentBlock $block): bool
    {
        return $block->tenant_id === $user->tenant_id
            || $block->created_by === $user->id;
    }

    public function delete(User $user, ContentBlock $block): bool
    {
        return $block->tenant_id === $user->tenant_id
            || $block->created_by === $user->id;
    }

    public function duplicate(User $user, ContentBlock $block): bool
    {
        return $block->tenant_id === $user->tenant_id
            || $block->created_by === $user->id;
    }
}

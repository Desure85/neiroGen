<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TenantDemoSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::firstOrCreate(
            ['id' => 1],
            ['name' => 'Demo School', 'slug' => 'demo', 'settings' => null]
        );

        $users = [
            [
                'email' => 'admin@demo.local',
                'name' => 'Admin Demo',
                'role' => 'admin',
            ],
            [
                'email' => 'admin@example.com',
                'name' => 'Admin Example',
                'role' => 'admin',
            ],
            [
                'email' => 'teacher@demo.local',
                'name' => 'Teacher Demo',
                'role' => 'teacher',
            ],
            [
                'email' => 'teacher@example.com',
                'name' => 'Teacher Example',
                'role' => 'teacher',
            ],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                [
                    'name' => $user['name'],
                    'password' => Hash::make('password'),
                    'tenant_id' => $tenant->id,
                    'role' => $user['role'],
                ]
            );
        }
    }
}

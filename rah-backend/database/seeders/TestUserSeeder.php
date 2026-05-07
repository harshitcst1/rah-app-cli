<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class TestUserSeeder extends Seeder
{
    public function run(): void
    {
        // Clear existing test user
        User::where('phone_e164', '+911234567890')->forceDelete();

        // Create regular test user
        User::create([
            'name' => 'Test User',
            'email' => 'user@rahenoor.com',
            'phone_e164' => '+911234567890',
            'password' => bcrypt('user123'),
            'is_admin' => false,
            'phone_verified_at' => now(),
            'city' => 'Mumbai',
            'daily_goal' => 500,
        ]);

        $this->command->info("✅ Test user created!");
        $this->command->info("📱 Phone: 1234567890");
        $this->command->info("🔒 Password: user123");
    }
}

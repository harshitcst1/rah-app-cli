<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // Clear existing admin (using phone_e164 column with +91 prefix)
        User::where('phone_e164', '+919876543210')->forceDelete();

        // Create admin user
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@rahenoor.com',
            'phone_e164' => '+919876543210',  // Must include +91 prefix!
            'password' => bcrypt('admin123'),
            'is_admin' => true,
            'phone_verified_at' => now(),
            'city' => 'Rajkot',
            'daily_goal' => 1000,
        ]);

        $this->command->info("✅ Admin user created!");
        $this->command->info("📱 Phone: 9876543210");
        $this->command->info("🔒 Password: admin123");
        $this->command->info("");
        $this->command->info("You can now login via the app or test with:");
        $this->command->info('curl -X POST http://localhost:8000/api/login/password -H "Content-Type: application/json" -d "{\"phone\":\"9876543210\",\"password\":\"admin123\"}"');
    }
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'daily_goal')) {
                $table->unsignedInteger('daily_goal')->default(1000)->after('city');
            }
            if (!Schema::hasColumn('users', 'preferred_mode')) {
                $table->string('preferred_mode', 10)->default('tap')->after('daily_goal'); // tap|manual
            }
            if (!Schema::hasColumn('users', 'privacy_show_initials')) {
                $table->boolean('privacy_show_initials')->default(false)->after('preferred_mode');
            }
            if (!Schema::hasColumn('users', 'privacy_show_city')) {
                $table->boolean('privacy_show_city')->default(true)->after('privacy_show_initials');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'privacy_show_city')) {
                $table->dropColumn('privacy_show_city');
            }
            if (Schema::hasColumn('users', 'privacy_show_initials')) {
                $table->dropColumn('privacy_show_initials');
            }
            if (Schema::hasColumn('users', 'preferred_mode')) {
                $table->dropColumn('preferred_mode');
            }
            if (Schema::hasColumn('users', 'daily_goal')) {
                $table->dropColumn('daily_goal');
            }
        });
    }
};

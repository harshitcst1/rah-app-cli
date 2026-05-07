<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('pending_registrations', function (Blueprint $table) {
            if (!Schema::hasColumn('pending_registrations', 'sends_count')) {
                $table->unsignedTinyInteger('sends_count')->default(0)->after('otp_attempts');
            }
            if (!Schema::hasColumn('pending_registrations', 'last_otp_sent_at')) {
                $table->timestamp('last_otp_sent_at')->nullable()->after('sends_count');
            }
            if (!Schema::hasColumn('pending_registrations', 'locked_until')) {
                $table->timestamp('locked_until')->nullable()->after('last_otp_sent_at');
            }
        });
    }

    public function down(): void {
        Schema::table('pending_registrations', function (Blueprint $table) {
            if (Schema::hasColumn('pending_registrations', 'locked_until')) {
                $table->dropColumn('locked_until');
            }
            if (Schema::hasColumn('pending_registrations', 'last_otp_sent_at')) {
                $table->dropColumn('last_otp_sent_at');
            }
            if (Schema::hasColumn('pending_registrations', 'sends_count')) {
                $table->dropColumn('sends_count');
            }
        });
    }
};
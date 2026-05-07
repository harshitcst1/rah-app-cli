<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('pending_logins', function (Blueprint $table) {
            if (!Schema::hasColumn('pending_logins', 'phone_e164')) {
                $table->string('phone_e164', 16)->unique()->after('id');
            }
            if (!Schema::hasColumn('pending_logins', 'otp_hash')) {
                $table->string('otp_hash', 64)->after('phone_e164');
            }
            if (!Schema::hasColumn('pending_logins', 'otp_expires_at')) {
                $table->timestamp('otp_expires_at')->after('otp_hash');
            }
            if (!Schema::hasColumn('pending_logins', 'otp_attempts')) {
                $table->unsignedTinyInteger('otp_attempts')->default(0)->after('otp_expires_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pending_logins', function (Blueprint $table) {
            foreach (['otp_attempts','otp_expires_at','otp_hash','phone_e164'] as $col) {
                if (Schema::hasColumn('pending_logins', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
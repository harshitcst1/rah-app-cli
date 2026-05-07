<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('pending_logins', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('phone_e164', 16)->unique();
            $table->string('otp_hash', 64);
            $table->timestamp('otp_expires_at');
            $table->unsignedTinyInteger('otp_attempts')->default(0);
            $table->unsignedTinyInteger('sends_count')->default(0);
            $table->timestamp('last_otp_sent_at')->nullable();
            $table->timestamp('locked_until')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('pending_logins');
    }
};
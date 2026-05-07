<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('pending_registrations', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('name', 120);
            $table->string('email', 190)->nullable();

            $table->string('raw_phone', 40);
            $table->string('phone_e164', 20)->index();
            $table->string('city', 80)->nullable();

            $table->string('password_hash');

            // OTP lifecycle
            $table->string('otp_hash', 128)->nullable();
            $table->timestamp('otp_expires_at')->nullable();
            $table->unsignedSmallInteger('otp_attempts')->default(0);
            $table->unsignedTinyInteger('sends_count')->default(0);
            $table->timestamp('last_otp_sent_at')->nullable();
            $table->timestamp('locked_until')->nullable();

            $table->timestamps();

            $table->unique(['phone_e164']); // Only one active pending per phone
        });
    }

    public function down(): void {
        Schema::dropIfExists('pending_registrations');
    }
};
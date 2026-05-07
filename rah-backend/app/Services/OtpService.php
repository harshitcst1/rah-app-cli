<?php


namespace App\Services;

use Illuminate\Support\Str;
use Carbon\Carbon;

class OtpService
{
    protected int $length;
    protected int $ttlMinutes;
    protected string $hmacKey;

    public function __construct()
    {
        $this->length = (int) env('OTP_LENGTH', 6);
        $this->ttlMinutes = (int) env('OTP_TTL_MINUTES', 7);
        $this->hmacKey = config('app.key', 'base_key');
    }

    /**
     * Generate an OTP (raw + hash + expiry).
     */
    public function generate(): array
    {
        $code = $this->randomDigits($this->length);
        $hash = $this->hash($code);
        $expiresAt = Carbon::now()->addMinutes($this->ttlMinutes);

        return [
            'code' => $code,            // ONLY use immediately to send; never store plaintext
            'hash' => $hash,            // Store this in DB
            'expires_at' => $expiresAt, // Carbon instance
        ];
    }

    /**
     * Timing-safe validation (given user input vs stored hash).
     */
    public function validate(string $inputCode, string $storedHash): bool
    {
        return hash_equals($storedHash, $this->hash($inputCode));
    }

    /**
     * Internal: create HMAC SHA-256 hex string.
     */
    protected function hash(string $code): string
    {
        return hash_hmac('sha256', $code, $this->hmacKey);
    }

    /**
     * Produce numeric string with leading zeros preserved.
     */
    protected function randomDigits(int $length): string
    {
        $max = 10 ** $length - 1;
        $num = random_int(0, $max);
        return str_pad((string) $num, $length, '0', STR_PAD_LEFT);
    }
}
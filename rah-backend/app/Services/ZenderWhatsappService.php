<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ZenderWhatsappService
{
    protected string $baseUrl;
    protected string $secret;
    protected string $account;
    protected bool $enabled;
    protected bool $logPreview;

    public function __construct()
    {
        $this->baseUrl    = rtrim(env('ZENDER_BASE_URL', ''), '/');
        $this->secret     = (string) env('ZENDER_API_SECRET', '');
        $this->account    = (string) env('ZENDER_ACCOUNT_ID', '');
        $this->enabled    = filter_var(env('ZENDER_ENABLE', false), FILTER_VALIDATE_BOOLEAN);
        $this->logPreview = filter_var(env('ZENDER_LOG_OTP_PREVIEW', false), FILTER_VALIDATE_BOOLEAN);
    }

    public function sendOtp(string $phoneE164, string $message): array
    {
        if ($phoneE164 === '' || $message === '') {
            return ['sent' => false, 'reason' => 'empty_parameters'];
        }

        if (!$this->enabled) {
            if ($this->logPreview) {
                Log::info('[ZENDER DRY RUN]', [
                    'phone' => $this->mask($phoneE164),
                    'preview' => $message,
                ]);
            } else {
                Log::info('[ZENDER DRY RUN]', ['phone' => $this->mask($phoneE164)]);
            }
            return ['sent' => true, 'dry_run' => true];
        }

        if ($this->baseUrl === '' || $this->secret === '' || $this->account === '') {
            Log::warning('[ZENDER CONFIG MISSING]', ['phone' => $this->mask($phoneE164)]);
            return ['sent' => false, 'reason' => 'config_incomplete'];
        }

        $endpoint = $this->baseUrl . '/api/send/whatsapp';

        try {
            $response = Http::asMultipart()->timeout(20)->post($endpoint, [
                'secret'    => $this->secret,
                'account'   => $this->account,
                'recipient' => $phoneE164,
                'type'      => 'text',
                'message'   => $message,
                'priority'  => 1, // immediate send
            ]);

            $status = $response->status();
            $json   = $response->json();

            if ($response->successful() && isset($json['status']) && (int)$json['status'] === 200) {
                Log::info('[ZENDER SENT]', [
                    'phone' => $this->mask($phoneE164),
                    'queued_message' => $json['message'] ?? null,
                ]);
                return [
                    'sent' => true,
                    'dry_run' => false,
                    'http' => $status,
                    'provider_status' => $json['status'] ?? null,
                    'provider_message' => $json['message'] ?? null,
                ];
            }

            Log::error('[ZENDER FAIL]', [
                'phone' => $this->mask($phoneE164),
                'http'  => $status,
                'body'  => $response->body(),
            ]);
            return ['sent' => false, 'reason' => 'http_error', 'http' => $status];
        } catch (\Throwable $e) {
            Log::error('[ZENDER EXCEPTION]', [
                'phone' => $this->mask($phoneE164),
                'error' => $e->getMessage(),
            ]);
            return ['sent' => false, 'reason' => 'exception'];
        }
    }

    protected function mask(string $phone): string
    {
        if (preg_match('/^\+91\d{10}$/', $phone)) {
            return substr($phone, 0, 3) . '****' . substr($phone, -2);
        }
        return substr($phone, 0, 2) . '***';
    }
}
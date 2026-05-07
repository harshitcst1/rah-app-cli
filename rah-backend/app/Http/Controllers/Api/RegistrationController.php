<?php


namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\PendingRegistration;
use App\Models\User;
use App\Services\OtpService;
use App\Services\ZenderWhatsappService;
use Illuminate\Support\Facades\Auth;

class RegistrationController extends Controller
{
    public function start(Request $request, OtpService $otpService, ZenderWhatsappService $wa)
    {
        $data = $request->validate([
            'name'     => 'required|string|min:2|max:120',
            'email'    => 'nullable|email|max:190',
            'phone'    => 'required|string|max:32',
            'password' => 'required|string|min:6|max:100',
            'city'     => 'nullable|string|max:80',
        ]);

        $rawPhone = $data['phone'];
        $phoneE164 = $this->normalizeIndianPhone($rawPhone);
        if (!$phoneE164) {
            return response()->json(['ok' => false, 'error' => 'invalid_phone'], 422);
        }

        if (User::where('phone_e164', $phoneE164)->exists()) {
            return response()->json(['ok' => false, 'error' => 'phone_in_use'], 409);
        }

        $otp = $otpService->generate();
        $message = "Rah e Noor OTP: {$otp['code']}. Valid 7 min. Do not share. Powered By CanStart.in";

        DB::transaction(function () use ($data, $phoneE164, $rawPhone, $otp) {
            PendingRegistration::where('phone_e164', $phoneE164)->delete();

            PendingRegistration::create([
                'name'             => $data['name'],
                'email'            => $data['email'] ?? null,
                'raw_phone'        => $rawPhone,
                'phone_e164'       => $phoneE164,
                'city'             => $data['city'] ?? null,
                'password_hash'    => Hash::make($data['password']),
                'otp_hash'         => $otp['hash'],
                'otp_expires_at'   => $otp['expires_at'],
                'otp_attempts'     => 0,
                'sends_count'      => 1,
                'last_otp_sent_at' => now(),
            ]);
        });

        $pending = PendingRegistration::where('phone_e164', $phoneE164)->first();
        $send = $wa->sendOtp($phoneE164, $message);

        return response()->json([
            'ok' => true,
            'registration_id' => $pending->id,
            'phone_masked' => $this->maskPhone($phoneE164),
            'expires_at' => $otp['expires_at']->toIso8601String(),
            'dry_run' => $send['dry_run'] ?? false,
        ]);
    }

    private function normalizeIndianPhone(string $input): ?string
    {
        $digits = preg_replace('/\D+/', '', $input);

        if (strlen($digits) === 11 && str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }
        if (strlen($digits) === 10) {
            return '+91' . $digits;
        }
        if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
            return '+' . $digits;
        }
        if (str_starts_with($input, '+91') && strlen($digits) === 12) {
            return '+91' . substr($digits, 2);
        }
        return null;
    }

    private function maskPhone(string $phone): string
    {
        return substr($phone, 0, 6) . '****' . substr($phone, -2);
    }

    public function verify(Request $request)
    {
        $data = $request->validate([
            'registration_id' => 'required|uuid',
            'otp'             => 'required|string|size:6',
        ]);

        $maxAttempts = (int) env('OTP_MAX_ATTEMPTS', 5);

        $pending = PendingRegistration::find($data['registration_id']);

        if (!$pending) {
            return response()->json(['ok' => false, 'error' => 'not_found'], 404);
        }
        if ($pending->locked_until && now()->lt($pending->locked_until)) {
            return response()->json(['ok' => false, 'error' => 'locked'], 423);
        }
        if (!$pending->otp_expires_at || now()->gt($pending->otp_expires_at)) {
            return response()->json(['ok' => false, 'error' => 'expired'], 410);
        }
        if ($pending->otp_attempts >= $maxAttempts) {
            return response()->json(['ok' => false, 'error' => 'attempts_exceeded'], 429);
        }

        $otpService = app(OtpService::class);
        $valid = $pending->otp_hash && $otpService->validate($data['otp'], $pending->otp_hash);

        if (!$valid) {
            $pending->increment('otp_attempts');
            if ($pending->otp_attempts >= $maxAttempts) {
                $pending->locked_until = now()->addMinutes((int) env('OTP_LOCK_MINUTES', 30));
                $pending->save();
                return response()->json(['ok' => false, 'error' => 'attempts_exceeded'], 429);
            }
            return response()->json(['ok' => false, 'error' => 'invalid_code'], 422);
        }

        $user = User::where('phone_e164', $pending->phone_e164)->first();

        if (!$user) {
            $user = User::create([
                'name'              => $pending->name,
                'email'             => $pending->email,
                'phone_e164'        => $pending->phone_e164,
                'phone_verified_at' => now(),
                'password'          => $pending->password_hash,
            ]);
        } elseif (!$user->phone_verified_at) {
            $user->phone_verified_at = now();
            $user->save();
        }

        $pending->delete();

        // Auto-login (session)
        Auth::login($user);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json([
            'ok' => true,
            'user_id' => $user->id,
            'phone' => $user->phone_e164,
            'verified' => true,
            'logged_in' => true,
            'redirect' => route('dashboard'),
        ]);
    }

    public function resend(Request $request, OtpService $otpService, ZenderWhatsappService $wa)
    {
        $data = $request->validate([
            'registration_id' => 'required|uuid',
        ]);

        $pending = PendingRegistration::find($data['registration_id']);
        if (!$pending) {
            return response()->json(['ok' => false, 'error' => 'not_found'], 404);
        }

        // Locked?
        if ($pending->locked_until && now()->lt($pending->locked_until)) {
            return response()->json(['ok' => false, 'error' => 'locked'], 423);
        }

        $cooldownSeconds = (int) env('OTP_RESEND_COOLDOWN_SECONDS', 60);
        $maxSendsPerDay  = (int) env('OTP_MAX_SENDS_PER_DAY', 6);

        // Daily limit
        if ($pending->sends_count >= $maxSendsPerDay) {
            return response()->json([
                'ok' => false,
                'error' => 'sends_limit',
                'limit' => $maxSendsPerDay
            ], 429);
        }

        // Cooldown check
        if ($pending->last_otp_sent_at && now()->diffInSeconds($pending->last_otp_sent_at) < $cooldownSeconds) {
            $retryAfter = $cooldownSeconds - now()->diffInSeconds($pending->last_otp_sent_at);
            return response()->json([
                'ok' => false,
                'error' => 'cooldown',
                'retry_after' => $retryAfter
            ], 429);
        }

        // Generate new OTP
        $otp = $otpService->generate();
        $message = "Rah e Noor OTP: {$otp['code']}. Valid 7 min. Do not share.";

        // Update row
        $pending->otp_hash        = $otp['hash'];
        $pending->otp_expires_at  = $otp['expires_at'];
        $pending->otp_attempts    = 0;
        $pending->sends_count     = $pending->sends_count + 1;
        $pending->last_otp_sent_at= now();
        $pending->save();

        $send = $wa->sendOtp($pending->phone_e164, $message);

        $remaining = max(0, $maxSendsPerDay - $pending->sends_count);

        return response()->json([
            'ok' => true,
            'registration_id' => $pending->id,
            'phone_masked' => $this->maskPhone($pending->phone_e164),
            'expires_at' => $otp['expires_at']->toIso8601String(),
            'sends_count' => $pending->sends_count,
            'remaining_sends' => $remaining,
            'dry_run' => $send['dry_run'] ?? false,
        ]);
    }

    /**
     * Complete registration (create user and return token for API)
     * This is an alternative to verify() for mobile apps
     * POST /api/register/complete
     */
    public function complete(Request $request)
    {
        $data = $request->validate([
            'registration_id' => 'required|uuid',
            'otp'             => 'required|string|size:6',
        ]);

        $maxAttempts = (int) env('OTP_MAX_ATTEMPTS', 5);

        $pending = PendingRegistration::find($data['registration_id']);

        if (!$pending) {
            return response()->json(['ok' => false, 'error' => 'not_found'], 404);
        }
        if ($pending->locked_until && now()->lt($pending->locked_until)) {
            return response()->json(['ok' => false, 'error' => 'locked'], 423);
        }
        if (!$pending->otp_expires_at || now()->gt($pending->otp_expires_at)) {
            return response()->json(['ok' => false, 'error' => 'expired'], 410);
        }
        if ($pending->otp_attempts >= $maxAttempts) {
            return response()->json(['ok' => false, 'error' => 'attempts_exceeded'], 429);
        }

        $otpService = app(OtpService::class);
        $valid = $pending->otp_hash && $otpService->validate($data['otp'], $pending->otp_hash);

        if (!$valid) {
            $pending->increment('otp_attempts');
            if ($pending->otp_attempts >= $maxAttempts) {
                $pending->locked_until = now()->addMinutes((int) env('OTP_LOCK_MINUTES', 30));
                $pending->save();
                return response()->json(['ok' => false, 'error' => 'attempts_exceeded'], 429);
            }
            return response()->json(['ok' => false, 'error' => 'invalid_code'], 422);
        }

        $user = User::where('phone_e164', $pending->phone_e164)->first();

        if (!$user) {
            $user = User::create([
                'name'              => $pending->name,
                'email'             => $pending->email,
                'phone_e164'        => $pending->phone_e164,
                'phone_verified_at' => now(),
                'password'          => $pending->password_hash,
                'city'              => $pending->city,
            ]);
        } elseif (!$user->phone_verified_at) {
            $user->phone_verified_at = now();
            $user->save();
        }

        $pending->delete();

        // Create Sanctum token for mobile
        $token = $user->createToken('mobile-app')->plainTextToken;

        return response()->json([
            'ok' => true,
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'phone_masked' => $this->maskPhone($user->phone_e164),
                'city' => $user->city,
                'is_admin' => (bool) ($user->is_admin ?? false),
            ],
        ]);
    }

}
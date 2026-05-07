<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\PendingLogin;
use App\Services\OtpService;
use App\Services\ZenderWhatsappService;

class LoginController extends Controller
{
    // Step 1: Start OTP login
    public function start(Request $request, OtpService $otpService, ZenderWhatsappService $wa)
    {
        $data = $request->validate([
            'phone' => 'required|string|max:32',
        ]);

        $phoneE164 = $this->normalizeIndianPhone($data['phone'] ?? '');
        if (!$phoneE164) {
            return response()->json(['ok' => false, 'error' => 'invalid_phone'], 422);
        }

        $user = User::where('phone_e164', $phoneE164)->first();
        if (!$user) {
            return response()->json(['ok' => false, 'error' => 'user_not_found'], 404);
        }

        $otp = $otpService->generate();
        $message = "Rah e Noor OTP: {$otp['code']}. Valid 7 min. Do not share.";

        PendingLogin::where('phone_e164', $phoneE164)->delete();

        $pending = PendingLogin::create([
            'id'             => (string) Str::uuid(),
            'phone_e164'     => $phoneE164,
            'otp_hash'       => $otp['hash'],
            'otp_expires_at' => $otp['expires_at'],
            'otp_attempts'   => 0,
        ]);

        $send = $wa->sendOtp($phoneE164, $message);

        return response()->json([
            'ok' => true,
            'login_id' => $pending->id,
            'phone_masked' => $this->maskPhone($phoneE164),
            'expires_at' => $otp['expires_at']->toIso8601String(),
            'dry_run' => $send['dry_run'] ?? false,
        ]);
    }

    // Step 1b: Resend OTP (simple version, no cooldown without extra columns)
    public function resend(Request $request, OtpService $otpService, ZenderWhatsappService $wa)
    {
        $data = $request->validate([
            'login_id' => 'required|uuid',
        ]);

        $pending = PendingLogin::find($data['login_id']);
        if (!$pending) {
            return response()->json(['ok' => false, 'error' => 'not_found'], 404);
        }

        $otp = $otpService->generate();
        $message = "Rah e Noor OTP: {$otp['code']}. Valid 7 min. Do not share.";

        $pending->otp_hash       = $otp['hash'];
        $pending->otp_expires_at = $otp['expires_at'];
        $pending->otp_attempts   = 0;
        $pending->save();

        $send = $wa->sendOtp($pending->phone_e164, $message);

        return response()->json([
            'ok' => true,
            'login_id' => $pending->id,
            'phone_masked' => $this->maskPhone($pending->phone_e164),
            'expires_at' => $otp['expires_at']->toIso8601String(),
            'dry_run' => $send['dry_run'] ?? false,
        ]);
    }

    // Step 2: Verify OTP (web route uses session)
    public function verify(Request $request, OtpService $otpService)
    {
        $data = $request->validate([
            'login_id' => 'required|uuid',
            'otp'      => 'required|string|size:6',
        ]);

        $pending = PendingLogin::find($data['login_id']);
        if (!$pending) {
            return response()->json(['ok' => false, 'error' => 'not_found'], 404);
        }

        if (!$pending->otp_expires_at || now()->gt($pending->otp_expires_at)) {
            return response()->json(['ok' => false, 'error' => 'expired'], 410);
        }

        $maxAttempts = (int) env('OTP_MAX_ATTEMPTS', 5);
        if ($pending->otp_attempts >= $maxAttempts) {
            return response()->json(['ok' => false, 'error' => 'attempts_exceeded'], 429);
        }

        $valid = $pending->otp_hash && $otpService->validate($data['otp'], $pending->otp_hash);
        if (!$valid) {
            $pending->increment('otp_attempts');
            if ($pending->otp_attempts >= $maxAttempts) {
                return response()->json(['ok' => false, 'error' => 'attempts_exceeded'], 429);
            }
            return response()->json(['ok' => false, 'error' => 'invalid_code'], 422);
        }

        $user = User::where('phone_e164', $pending->phone_e164)->first();
        if (!$user) {
            $pending->delete();
            return response()->json(['ok' => false, 'error' => 'user_not_found'], 404);
        }

        $pending->delete();
        Auth::login($user);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json([
            'ok' => true,
            'logged_in' => true,
            'redirect' => route('dashboard'),
        ]);
    }

    private function normalizeIndianPhone(string $input): ?string
    {
        $digits = preg_replace('/\D+/', '', $input);
        if (strlen($digits) === 10) return '+91' . $digits;
        if (strlen($digits) === 11 && str_starts_with($digits, '0')) return '+91' . substr($digits, 1);
        if (strlen($digits) === 12 && str_starts_with($digits, '91')) return '+' . $digits;
        if (strlen($digits) === 13 && str_starts_with($digits, '91') && str_starts_with($input, '+')) return $input;
        return null;
    }

    private function maskPhone(string $phone): string
    {
        if (preg_match('/^\+91\d{10}$/', $phone)) {
            return substr($phone, 0, 3) . '****' . substr($phone, -2);
        }
        return substr($phone, 0, 2) . '***';
    }

    // ========================================================================
    // API-SPECIFIC METHODS (for Sanctum token auth)
    // ========================================================================

    /**
     * Password-based login (fallback for mobile when OTP fails)
     * POST /api/login/password
     */
    public function passwordLogin(Request $request)
    {
        $data = $request->validate([
            'phone' => 'required|string',
            'password' => 'required|string',
        ]);

        $phoneE164 = $this->normalizeIndianPhone($data['phone']);
        if (!$phoneE164) {
            return response()->json(['ok' => false, 'error' => 'invalid_phone'], 422);
        }

        $user = User::where('phone_e164', $phoneE164)->first();
        if (!$user || !\Illuminate\Support\Facades\Hash::check($data['password'], $user->password)) {
            return response()->json(['ok' => false, 'error' => 'invalid_credentials'], 401);
        }

        // Create Sanctum token
        $token = $user->createToken('mobile-app')->plainTextToken;

        return response()->json([
            'ok' => true,
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'phone_masked' => $this->maskPhone($phoneE164),
                'is_admin' => (bool) ($user->is_admin ?? false),
            ],
        ]);
    }

    /**
     * Logout (revoke current access token)
     * POST /api/logout
     */
    public function logout(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['ok' => false, 'error' => 'unauthenticated'], 401);
        }

        // Revoke the current access token
        $request->user()->currentAccessToken()->delete();

        return response()->json(['ok' => true, 'message' => 'Logged out successfully']);
    }

    /**
     * API version of verify (returns Sanctum token instead of session)
     * You can call this from mobile after OTP verification
     */
    public function verifyApi(Request $request, OtpService $otpService)
    {
        $data = $request->validate([
            'login_id' => 'required|uuid',
            'otp'      => 'required|string|size:6',
        ]);

        $pending = PendingLogin::find($data['login_id']);
        if (!$pending) {
            return response()->json(['ok' => false, 'error' => 'not_found'], 404);
        }

        if (!$pending->otp_expires_at || now()->gt($pending->otp_expires_at)) {
            return response()->json(['ok' => false, 'error' => 'expired'], 410);
        }

        $maxAttempts = (int) env('OTP_MAX_ATTEMPTS', 5);
        if ($pending->otp_attempts >= $maxAttempts) {
            return response()->json(['ok' => false, 'error' => 'attempts_exceeded'], 429);
        }

        $valid = $pending->otp_hash && $otpService->validate($data['otp'], $pending->otp_hash);
        if (!$valid) {
            $pending->increment('otp_attempts');
            if ($pending->otp_attempts >= $maxAttempts) {
                return response()->json(['ok' => false, 'error' => 'attempts_exceeded'], 429);
            }
            return response()->json(['ok' => false, 'error' => 'invalid_code'], 422);
        }

        $user = User::where('phone_e164', $pending->phone_e164)->first();
        if (!$user) {
            $pending->delete();
            return response()->json(['ok' => false, 'error' => 'user_not_found'], 404);
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
                'is_admin' => (bool) ($user->is_admin ?? false),
            ],
        ]);
    }
}
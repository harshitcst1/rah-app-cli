<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        $u = Auth::user();
        if (!$u) return response()->json(['ok' => false, 'error' => 'unauthenticated'], 401);

        $phone = (string) ($u->phone_e164 ?? '');
        $masked = $this->maskPhone($phone);

        return response()->json([
            'ok' => true,
            'user' => [
                'name' => (string) $u->name,
                'city' => $u->city,
                'daily_goal' => (int) ($u->daily_goal ?? 1000),
                'preferred_mode' => $u->preferred_mode ?? 'tap',
                'privacy_show_initials' => (bool) ($u->privacy_show_initials ?? false),
                'privacy_show_city' => (bool) ($u->privacy_show_city ?? true),
                'phone_masked' => $masked,
                'phone_verified' => !is_null($u->phone_verified_at),
                'email' => $u->email,
            ],
        ]);
    }

    public function update(Request $request)
    {
        $u = Auth::user();
        if (!$u) return response()->json(['ok' => false, 'error' => 'unauthenticated'], 401);

        $data = $request->validate([
            'name' => 'required|string|max:120',
            'city' => 'nullable|string|max:100',
            'daily_goal' => 'required|integer|min:1|max:1000000',
            'preferred_mode' => 'required|string|in:tap,manual',
            'privacy_show_initials' => 'required|boolean',
            'privacy_show_city' => 'required|boolean',
        ]);

        $u->fill($data)->save();

        $phone = (string) ($u->phone_e164 ?? '');
        $masked = $this->maskPhone($phone);

        return response()->json([
            'ok' => true,
            'user' => [
                'name' => (string) $u->name,
                'city' => $u->city,
                'daily_goal' => (int) ($u->daily_goal ?? 1000),
                'preferred_mode' => $u->preferred_mode ?? 'tap',
                'privacy_show_initials' => (bool) ($u->privacy_show_initials ?? false),
                'privacy_show_city' => (bool) ($u->privacy_show_city ?? true),
                'phone_masked' => $masked,
                'phone_verified' => !is_null($u->phone_verified_at),
                'email' => $u->email,
            ],
        ]);
    }

    private function maskPhone(string $e164): string
    {
        if ($e164 === '' || strlen($e164) < 6) return $e164 ?: '—';
        // Keep country code and last 2 digits, mask the middle
        $cc = substr($e164, 0, 3); // rough; good for +91 style
        $last2 = substr($e164, -2);
        return $cc . ' •••• ••' . $last2;
    }
}
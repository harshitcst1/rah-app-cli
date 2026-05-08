<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        $u = Auth::user();
        if (!$u) return response()->json(['ok' => false, 'error' => 'unauthenticated'], 401);

        $phone = (string) ($u->phone_e164 ?? '');
        $masked = $this->maskPhone($phone);

        $profileImageUrl = null;
        if ($u->profile_image) {
            $profileImageUrl = asset('storage/' . $u->profile_image);
        }

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
                'profile_image' => $profileImageUrl,
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

        $profileImageUrl = null;
        if ($u->profile_image) {
            $profileImageUrl = asset('storage/' . $u->profile_image);
        }

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
                'profile_image' => $profileImageUrl,
            ],
        ]);
    }

    public function uploadImage(Request $request)
    {
        $u = Auth::user();
        if (!$u) return response()->json(['ok' => false, 'error' => 'unauthenticated'], 401);

        $request->validate([
            'profile_image' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120',
        ]);

        try {
            // Delete old image if it exists
            if ($u->profile_image && Storage::disk('public')->exists($u->profile_image)) {
                Storage::disk('public')->delete($u->profile_image);
            }

            // Store new image
            $path = $request->file('profile_image')->store('profiles', 'public');
            
            // Update user
            $u->update(['profile_image' => $path]);

            $profileImageUrl = asset('storage/' . $path);

            return response()->json([
                'ok' => true,
                'profile_image' => $profileImageUrl,
                'message' => 'Profile image uploaded successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'ok' => false,
                'error' => 'Failed to upload image: ' . $e->getMessage(),
            ], 500);
        }
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
<?php


namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\LeaderboardService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LeaderboardAdminController extends Controller
{
    public function index(Request $request, LeaderboardService $svc)
    {
        $user = Auth::user();
        if (!$user || !$user->is_admin) {
            return response()->json(['ok' => false, 'error' => 'forbidden'], 403);
        }

        $range = in_array($request->get('range'), ['season','month','week','today']) ? $request->get('range') : 'season';

        // Global scope by default for admin
        $data = $svc->leaderboard($user, 'global', $range, null);

        return response()->json(['ok' => true] + $data);
    }
}
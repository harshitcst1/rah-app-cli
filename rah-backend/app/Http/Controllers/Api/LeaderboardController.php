<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LeaderboardService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LeaderboardController extends Controller
{
    public function index(Request $request, LeaderboardService $svc)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['ok' => false, 'error' => 'unauthenticated'], 401);

        $scope = in_array($request->get('scope'), ['city','global']) ? $request->get('scope') : 'city';
        $range = in_array($request->get('range'), ['season','month','week','today']) ? $request->get('range') : 'season';
        $city  = $request->get('city');

        $data = $svc->leaderboard($user, $scope, $range, $city);

        return response()->json(['ok' => true] + $data);
    }
}
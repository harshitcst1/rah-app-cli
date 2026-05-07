<?php


namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\StatsService;
use App\Services\StreakService;

class StatsController extends Controller
{
    public function todayWeek(Request $request, StatsService $stats)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['ok' => false, 'error' => 'unauthenticated'], 401);

        $data = $stats->todayWeek($user);
        return response()->json(['ok' => true] + $data);
    }

    public function streak(Request $request, StreakService $streaks)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['ok' => false, 'error' => 'unauthenticated'], 401);

        $data = $streaks->compute($user);
        return response()->json(['ok' => true] + $data);
    }

    public function season(Request $request, StatsService $stats)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['ok' => false, 'error' => 'unauthenticated'], 401);

        $data = $stats->season($user);
        return response()->json(['ok' => true] + $data);
    }
}
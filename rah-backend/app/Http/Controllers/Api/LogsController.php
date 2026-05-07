<?php


namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\DaroodLog;
use Carbon\Carbon;

class LogsController extends Controller
{
    // POST /api/logs
    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['ok' => false, 'error' => 'unauthenticated'], 401);

        $data = $request->validate([
            'darood_type_id' => 'required|exists:darood_types,id',
            'count'          => 'required|integer|min:1|max:100000',
            'source'         => 'required|string|in:tap,manual',
        ]);

        $log = DaroodLog::create([
            'user_id'        => $user->id,
            'darood_type_id' => (int) $data['darood_type_id'],
            'count'          => (int) $data['count'],
            'source'         => $data['source'],
            'logged_at'      => Carbon::today()->toDateString(),
        ]);

        $today = $log->logged_at;
        $todayTotal = DaroodLog::where('user_id', $user->id)
            ->where('logged_at', $today)
            ->sum('count');

        $last = DaroodLog::where('user_id', $user->id)
            ->where('logged_at', $today)
            ->latest('created_at')
            ->first();

        return response()->json([
            'ok' => true,
            'log' => [
                'id' => (string) $log->id,
                'count' => (int) $log->count,
                'source' => $log->source,
                'logged_at' => $log->logged_at,
            ],
            'today_total' => (int) $todayTotal,
            'last_log' => $last ? [
                'id' => (string) $last->id,
                'count' => (int) $last->count,
                'at' => optional($last->created_at)->toIso8601String(),
            ] : null,
        ]);
    }

    // DELETE /api/logs/{id} — only allow undo of latest log from today
    public function destroy(string $id)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['ok' => false, 'error' => 'unauthenticated'], 401);

        $log = DaroodLog::find($id);
        if (!$log || $log->user_id !== $user->id) {
            return response()->json(['ok' => false, 'error' => 'not_found'], 404);
        }

        if ($log->logged_at !== Carbon::today()->toDateString()) {
            return response()->json(['ok' => false, 'error' => 'not_today'], 422);
        }

        $latest = DaroodLog::where('user_id', $user->id)
            ->where('logged_at', $log->logged_at)
            ->latest('created_at')
            ->first();

        if (!$latest || $latest->id !== $log->id) {
            return response()->json(['ok' => false, 'error' => 'not_latest'], 409);
        }

        $log->delete();

        $todayTotal = DaroodLog::where('user_id', $user->id)
            ->where('logged_at', $log->logged_at)
            ->sum('count');

        $last = DaroodLog::where('user_id', $user->id)
            ->where('logged_at', $log->logged_at)
            ->latest('created_at')
            ->first();

        return response()->json([
            'ok' => true,
            'today_total' => (int) $todayTotal,
            'last_log' => $last ? [
                'id' => (string) $last->id,
                'count' => (int) $last->count,
                'at' => optional($last->created_at)->toIso8601String(),
            ] : null,
        ]);
    }
}
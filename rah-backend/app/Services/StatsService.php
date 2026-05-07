<?php

namespace App\Services;

use App\Models\DaroodLog;
use App\Models\User;
use Carbon\Carbon;

class StatsService
{
    public function todayWeek(User $user): array
    {
        $today = Carbon::today();
        $start = $today->copy()->subDays(6);

        // Week series: number of submissions per day
        $rows = DaroodLog::query()
            ->where('user_id', $user->id)
            ->whereBetween('logged_at', [$start->toDateString(), $today->toDateString()])
            ->selectRaw('logged_at, COUNT(*) as total')
            ->groupBy('logged_at')
            ->get()
            ->keyBy(fn($r) => Carbon::parse($r->logged_at)->toDateString());

        $series = [];
        for ($d = $start->copy(); $d->lte($today); $d->addDay()) {
            $key = $d->toDateString();
            $series[] = [
                'date' => $key,
                'total' => (int) ($rows[$key]->total ?? 0), // number of logs that day
            ];
        }

        // Today progress: sum of recitations (unchanged)
        $todayTotal = (int) DaroodLog::query()
            ->where('user_id', $user->id)
            ->where('logged_at', $today->toDateString())
            ->sum('count');

        // Last log today (if any)
        $lastLog = DaroodLog::query()
            ->where('user_id', $user->id)
            ->where('logged_at', $today->toDateString())
            ->latest('created_at')
            ->first();

        return [
            'today_total' => $todayTotal,
            'week_series' => $series, // now "how many times you logged" per day
            'last_log' => $lastLog ? [
                'id' => (string) $lastLog->id,
                'count' => (int) $lastLog->count,
                'at' => optional($lastLog->created_at)->toIso8601String(),
            ] : null,
            'goal' => (int) ($user->daily_goal ?? 0),
        ];
    }

    public function season(User $user): array
    {
        $today = Carbon::today();
        $start = Carbon::now()->startOfYear()->toDateString();
        $end   = Carbon::now()->endOfYear()->toDateString();
        $endsIn = Carbon::now()->diffInDays(Carbon::now()->endOfYear()) + 1;

        $yourTotal = (int) DaroodLog::query()
            ->where('user_id', $user->id)
            ->whereBetween('logged_at', [$start, $end])
            ->sum('count');

        $dailyGoal = (int) ($user->daily_goal ?? 0);
        $daysElapsed = Carbon::parse($start)->diffInDays($today) + 1;
        $daysTotal = Carbon::parse($start)->diffInDays(Carbon::parse($end)) + 1;

        $expected = $dailyGoal > 0 ? $dailyGoal * $daysElapsed : 0;
        $progressPct = $expected > 0 ? min(100, (int) round(($yourTotal / $expected) * 100)) : null;

        return [
            'your_total'    => $yourTotal,
            'ends_in_days'  => $endsIn,
            'days_elapsed'  => $daysElapsed,
            'days_total'    => $daysTotal,
            'daily_goal'    => $dailyGoal,
            'expected_so_far' => $expected,
            'progress_pct'  => $progressPct, // null if no goal set
        ];
    }
    
}
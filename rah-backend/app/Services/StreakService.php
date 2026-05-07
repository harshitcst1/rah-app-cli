<?php


namespace App\Services;

use App\Models\DaroodLog;
use App\Models\User;
use Carbon\Carbon;

class StreakService
{
    public function compute(User $user): array
    {
        // Pull distinct days with any count > 0
        $days = DaroodLog::query()
            ->where('user_id', $user->id)
            ->where('count', '>', 0)
            ->select('logged_at')
            ->distinct()
            ->orderBy('logged_at')
            ->pluck('logged_at')
            ->map(fn($d) => Carbon::parse($d)->toDateString())
            ->values()
            ->all();

        $set = array_flip($days);
        $today = Carbon::today()->toDateString();

        // Current streak: walk back from today
        $cur = 0;
        $cursor = Carbon::today();
        while (isset($set[$cursor->toDateString()])) {
            $cur++;
            $cursor->subDay();
        }

        // Longest streak: scan consecutive sequences
        $longest = 0;
        $run = 0;
        $prev = null;
        foreach ($days as $d) {
            if ($prev && Carbon::parse($d)->isSameDay(Carbon::parse($prev)->addDay())) {
                $run++;
            } else {
                $run = 1;
            }
            $longest = max($longest, $run);
            $prev = $d;
        }

        return [
            'current' => $cur,
            'longest' => $longest,
        ];
    }
}
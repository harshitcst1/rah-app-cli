<?php


namespace App\Services;

use App\Models\DaroodLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class LeaderboardService
{
    public function rangeBounds(string $range): array
    {
        $today = Carbon::today();
        switch ($range) {
            case 'today':
                return [$today->copy()->startOfDay()->toDateString(), $today->toDateString(), 0];
            case 'week':
                $start = Carbon::now()->startOfWeek(Carbon::SUNDAY)->toDateString();
                $end   = Carbon::now()->endOfWeek(Carbon::SATURDAY)->toDateString();
                $endsIn = Carbon::now()->diffInDays(Carbon::now()->endOfWeek(Carbon::SATURDAY)) + 1;
                return [$start, $end, $endsIn];
            case 'month':
                $start = Carbon::now()->startOfMonth()->toDateString();
                $end   = Carbon::now()->endOfMonth()->toDateString();
                $endsIn = Carbon::now()->diffInDays(Carbon::now()->endOfMonth()) + 1;
                return [$start, $end, $endsIn];
            case 'season':
            default:
                // Simple season: calendar year (adjust later to real season)
                $start = Carbon::now()->startOfYear()->toDateString();
                $end   = Carbon::now()->endOfYear()->toDateString();
                $endsIn = Carbon::now()->diffInDays(Carbon::now()->endOfYear()) + 1;
                return [$start, $end, $endsIn];
        }
    }

    // Returns top 20 + top3 + your rank (if not in top) for given scope/range
    public function leaderboard(User $user, string $scope = 'city', string $range = 'season', ?string $city = null): array
    {
        [$from, $to, $endsIn] = $this->rangeBounds($range);

        $cityToUse = $scope === 'city' ? ($city ?: ($user->city ?? null)) : null;

        $base = DaroodLog::query()
            ->join('users', 'users.id', '=', 'darood_logs.user_id')
            ->whereBetween('logged_at', [$from, $to])
            ->when($scope === 'city' && $cityToUse, fn($q) => $q->where('users.city', $cityToUse))
            ->groupBy('darood_logs.user_id', 'users.name', 'users.city')
            ->selectRaw('darood_logs.user_id as user_id, users.name, users.city, SUM(darood_logs.count) as total')
            ->orderByDesc('total')
            ->orderBy('users.name');

        // Pull top 20 for listing
        $top = (clone $base)->limit(20)->get();

        // Rank and shape
        $items = [];
        $rank = 1;
        foreach ($top as $row) {
            $items[] = [
                'rank' => $rank++,
                'user' => [
                    'id' => (int) $row->user_id,
                    'name' => $row->name ?? 'User',
                    'city' => $row->city ?? null,
                ],
                'total' => (int) $row->total,
            ];
        }

        // Top 3 podium
        $top3 = array_slice($items, 0, 3);

        // Your rank (if not visible already)
        $your = null;
        if ($user) {
            $yourTotal = DaroodLog::query()
                ->join('users', 'users.id', '=', 'darood_logs.user_id')
                ->where('darood_logs.user_id', $user->id)
                ->whereBetween('logged_at', [$from, $to])
                ->when($scope === 'city' && $cityToUse, fn($q) => $q->where('users.city', $cityToUse))
                ->sum('darood_logs.count');

            if ($yourTotal > 0) {
                // Count how many have strictly greater total to compute rank
                $higher = DaroodLog::query()
                    ->join('users', 'users.id', '=', 'darood_logs.user_id')
                    ->whereBetween('logged_at', [$from, $to])
                    ->when($scope === 'city' && $cityToUse, fn($q) => $q->where('users.city', $cityToUse))
                    ->groupBy('darood_logs.user_id')
                    ->selectRaw('SUM(darood_logs.count) as total')
                    ->havingRaw('SUM(darood_logs.count) > ?', [$yourTotal])
                    ->count();

                $your = [
                    'rank' => $higher + 1,
                    'total' => (int) $yourTotal,
                    'user' => [
                        'id' => (int) $user->id,
                        'name' => $user->name ?? 'You',
                        'city' => $user->city ?? null,
                    ],
                ];
            }
        }

        return [
            'meta' => [
                'scope' => $scope,
                'range' => $range,
                'city' => $cityToUse,
                'ends_in_days' => $endsIn,
            ],
            'top3' => $top3,
            'items' => $items,
            'your_rank' => $your,
        ];
    }
}
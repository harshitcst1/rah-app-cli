<?php


namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class KpiAdminController extends Controller
{
    public function index(Request $request)
    {
        $u = Auth::user();
        if (!$u || !($u->is_admin ?? false)) {
            return response()->json(['ok' => false, 'error' => 'forbidden'], 403);
        }

        $totalUsers = User::count();

        $activeToday = DB::table('darood_logs')
            ->whereDate('created_at', Carbon::today())
            ->distinct('user_id')
            ->count('user_id');

        $totalDarood = (int) DB::table('darood_logs')->sum('count');

        $top = DB::table('darood_logs')
            ->select('user_id', DB::raw('SUM(count) as total'))
            ->groupBy('user_id')
            ->orderByDesc('total')
            ->first();

        $topName = null;
        $topTotal = 0;
        if ($top) {
            $topTotal = (int) $top->total;
            $tu = User::select('name')->find($top->user_id);
            $topName = $tu?->name ?? '—';
        }

        return response()->json([
            'ok' => true,
            'total_users' => $totalUsers,
            'active_today' => $activeToday,
            'total_darood' => $totalDarood,
            'top_performer' => [
                'name' => $topName,
                'total' => $topTotal,
            ],
        ]);
    }
}
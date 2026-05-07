<?php


namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ActivityAdminController extends Controller
{
    public function index(Request $request)
    {
        $u = Auth::user();
        if (!$u || !($u->is_admin ?? false)) {
            return response()->json(['ok' => false, 'error' => 'forbidden'], 403);
        }

        $limit = min(max((int) $request->get('limit', 20), 1), 100);

        $rows = DB::table('darood_logs as l')
            ->join('users as u', 'u.id', '=', 'l.user_id')
            ->orderByDesc('l.created_at')
            ->limit($limit)
            ->get([
                'u.name as user_name',
                'u.city as user_city',
                'l.count',
                'l.created_at',
            ]);

        $items = $rows->map(fn ($r) => [
            'user' => ['name' => $r->user_name, 'city' => $r->user_city],
            'count' => (int) $r->count,
            'created_at' => Carbon::parse($r->created_at)->toIso8601String(),
        ]);

        return response()->json(['ok' => true, 'items' => $items]);
    }
}
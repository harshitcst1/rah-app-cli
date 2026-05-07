<?php


namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $u = $request->user();

        if (!$u) {
            // Check if this is an API request
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['ok' => false, 'error' => 'unauthenticated'], 401);
            }
            // Web request: redirect to login
            return redirect()->guest('/login');
        }

        if (!($u->is_admin ?? false)) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['ok' => false, 'error' => 'forbidden'], 403);
            }
            abort(403, 'Forbidden');
        }

        return $next($request);
    }
}
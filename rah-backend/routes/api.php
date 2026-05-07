<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\LoginController;
use App\Http\Controllers\Api\RegistrationController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\LogsController;
use App\Http\Controllers\Api\DaroodTypesController;
use App\Http\Controllers\Api\LeaderboardController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Admin\KpiAdminController;
use App\Http\Controllers\Admin\LeaderboardAdminController;
use App\Http\Controllers\Admin\ActivityAdminController;
use App\Http\Controllers\Admin\DaroodTypesAdminController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group.
|
*/

// ========================================================================
// PUBLIC ROUTES (No Authentication Required)
// ========================================================================

// Registration flow (3-step: start → verify OTP → complete)
Route::post('/register/start', [RegistrationController::class, 'start']);
Route::post('/register/resend', [RegistrationController::class, 'resend']);
Route::post('/register/verify', [RegistrationController::class, 'verify']);
Route::post('/register/complete', [RegistrationController::class, 'complete']);

// Login flow (2-step: start OTP → verify)
Route::post('/login/start', [LoginController::class, 'start']);
Route::post('/login/resend', [LoginController::class, 'resend']);
Route::post('/login/verify', [LoginController::class, 'verifyApi']);

// Password-based login fallback (if OTP fails)
Route::post('/login/password', [LoginController::class, 'passwordLogin']);

// ========================================================================
// AUTHENTICATED ROUTES (Require Sanctum Token)
// ========================================================================

Route::middleware('auth:sanctum')->group(function () {
    
    // Logout
    Route::post('/logout', [LoginController::class, 'logout']);
    
    // Profile
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::patch('/profile', [ProfileController::class, 'update']);
    
    // Darood Logs
    Route::post('/logs', [LogsController::class, 'store']);
    Route::delete('/logs/{id}', [LogsController::class, 'destroy']);
    
    // Darood Types (list available types)
    Route::get('/darood-types', [DaroodTypesController::class, 'index']);
    
    // Leaderboard
    Route::get('/leaderboard', [LeaderboardController::class, 'index']);
    
    // Stats endpoints
    Route::get('/stats/today-week', [StatsController::class, 'todayWeek']);
    Route::get('/stats/streak', [StatsController::class, 'streak']);
    Route::get('/stats/season', [StatsController::class, 'season']);
    
    // ========================================================================
    // ADMIN ROUTES (Require Admin Role)
    // ========================================================================
    
    Route::middleware('admin')->prefix('admin')->group(function () {
        
        // Dashboard KPIs
        Route::get('/kpi', [KpiAdminController::class, 'index']);
        
        // Admin Leaderboard (same as user but with admin controls)
        Route::get('/leaderboard', [LeaderboardAdminController::class, 'index']);
        
        // Recent Activity
        Route::get('/activity', [ActivityAdminController::class, 'index']);
        
        // Darood Type Management
        Route::get('/darood-types', [DaroodTypesAdminController::class, 'index']);
        Route::post('/darood-types', [DaroodTypesAdminController::class, 'store']);
        Route::patch('/darood-types/{id}', [DaroodTypesAdminController::class, 'update']);
        Route::delete('/darood-types/{id}', [DaroodTypesAdminController::class, 'destroy']);
        
    });
    
});

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AnnouncementRead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AnnouncementController extends Controller
{
    public function index()
    {
        $u = Auth::user();
        if (!$u) {
            return response()->json(['ok' => false, 'error' => 'unauthenticated'], 401);
        }

        $items = Announcement::query()
            ->where('is_active', true)
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->get()
            ->map(function (Announcement $announcement) use ($u) {
                $isRead = AnnouncementRead::query()
                    ->where('announcement_id', $announcement->id)
                    ->where('user_id', $u->id)
                    ->exists();

                // Build a photo URL using the current request host so devices can reach the image
                $photoUrl = null;
                if ($announcement->photo_path) {
                    $host = request()?->getSchemeAndHttpHost() ?: rtrim(config('app.url'), '/');
                    $photoUrl = $host . '/storage/' . $announcement->photo_path;
                }

                return [
                    'id' => (int) $announcement->id,
                    'subject' => (string) $announcement->subject,
                    'description' => (string) $announcement->description,
                    'photo_url' => $photoUrl,
                    'is_read' => $isRead,
                    'published_at' => optional($announcement->published_at ?? $announcement->created_at)?->toIso8601String(),
                ];
            });

        $readIds = AnnouncementRead::query()
            ->where('user_id', $u->id)
            ->pluck('announcement_id');

        $unreadCount = Announcement::query()
            ->where('is_active', true)
            ->whereNotIn('id', $readIds->isEmpty() ? [0] : $readIds->all())
            ->count();

        return response()->json([
            'ok' => true,
            'items' => $items,
            'unread_count' => $unreadCount,
        ]);
    }

    public function read(int $id)
    {
        $u = Auth::user();
        if (!$u) {
            return response()->json(['ok' => false, 'error' => 'unauthenticated'], 401);
        }

        $announcement = Announcement::query()
            ->where('is_active', true)
            ->find($id);

        if (!$announcement) {
            return response()->json(['ok' => false, 'error' => 'not_found'], 404);
        }

        AnnouncementRead::updateOrCreate([
            'announcement_id' => $announcement->id,
            'user_id' => $u->id,
        ]);

        return response()->json(['ok' => true]);
    }
}

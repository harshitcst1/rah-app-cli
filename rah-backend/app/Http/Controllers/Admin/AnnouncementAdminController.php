<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AnnouncementAdminController extends Controller
{
    public function index()
    {
        $u = Auth::user();
        if (!$u || !($u->is_admin ?? false)) {
            return response()->json(['ok' => false, 'error' => 'forbidden'], 403);
        }

        $items = Announcement::query()
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->limit(20)
            ->get()
            ->map(fn (Announcement $announcement) => $this->formatItem($announcement));

        return response()->json(['ok' => true, 'items' => $items]);
    }

    public function store(Request $request)
    {
        $u = Auth::user();
        if (!$u || !($u->is_admin ?? false)) {
            return response()->json(['ok' => false, 'error' => 'forbidden'], 403);
        }

        // Debug logging to help diagnose upload issues from mobile clients
        Log::info('AnnouncementAdminController@store called', [
            'hasFile_photo' => $request->hasFile('photo'),
            'allFiles' => array_keys($request->allFiles()),
            'has_photo_base64' => $request->filled('photo_base64'),
        ]);

        $data = $request->validate([
            'subject' => 'required|string|max:180',
            'description' => 'required|string|max:5000',
            'photo' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:4096',
            'photo_base64' => 'nullable|string',
            'photo_name' => 'nullable|string|max:255',
            'photo_mime' => 'nullable|string|max:100',
        ]);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $file = $request->file('photo');
            Log::info('Announcement photo received', [
                'originalName' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'mime' => $file->getClientMimeType(),
            ]);

            $photoPath = $file->store('announcements', 'public');
            Log::info('Announcement photo stored', ['photoPath' => $photoPath]);
        } elseif (!empty($data['photo_base64'])) {
            $base64 = (string) $data['photo_base64'];

            if (preg_match('/^data:(?<mime>[\w\-\.]+\/[\w\-\.+]+);base64,(?<payload>.+)$/', $base64, $matches) === 1) {
                $mime = strtolower((string) ($matches['mime'] ?? 'image/jpeg'));
                $payload = (string) ($matches['payload'] ?? '');
                $binary = base64_decode($payload, true);

                if ($binary !== false) {
                    $extensionMap = [
                        'image/jpeg' => 'jpg',
                        'image/jpg' => 'jpg',
                        'image/png' => 'png',
                        'image/webp' => 'webp',
                    ];
                    $ext = $extensionMap[$mime] ?? 'jpg';
                    $photoPath = 'announcements/' . Str::uuid()->toString() . '.' . $ext;
                    Storage::disk('public')->put($photoPath, $binary);

                    Log::info('Announcement base64 photo stored', [
                        'photoPath' => $photoPath,
                        'mime' => $mime,
                        'bytes' => strlen($binary),
                    ]);
                } else {
                    Log::warning('Announcement base64 decode failed');
                }
            } else {
                Log::warning('Announcement base64 format invalid');
            }
        }

        $announcement = Announcement::create([
            'created_by' => $u->id,
            'subject' => $data['subject'],
            'description' => $data['description'],
            'photo_path' => $photoPath,
            'is_active' => true,
            'published_at' => now(),
        ]);

        return response()->json([
            'ok' => true,
            'item' => $this->formatItem($announcement),
        ], 201);
    }

    public function destroy(int $id)
    {
        $u = Auth::user();
        if (!$u || !($u->is_admin ?? false)) {
            return response()->json(['ok' => false, 'error' => 'forbidden'], 403);
        }

        $announcement = Announcement::find($id);
        if (!$announcement) {
            return response()->json(['ok' => false, 'error' => 'not_found'], 404);
        }

        if ($announcement->photo_path) {
            Storage::disk('public')->delete($announcement->photo_path);
        }

        $announcement->delete();

        return response()->json(['ok' => true]);
    }

    private function formatItem(Announcement $announcement): array
    {
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
            'is_active' => (bool) $announcement->is_active,
            'published_at' => optional($announcement->published_at ?? $announcement->created_at)?->toIso8601String(),
        ];
    }
}

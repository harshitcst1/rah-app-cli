<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

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

        $data = $request->validate([
            'subject' => 'required|string|max:180',
            'description' => 'required|string|max:5000',
            'photo' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:4096',
        ]);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('announcements', 'public');
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
        return [
            'id' => (int) $announcement->id,
            'subject' => (string) $announcement->subject,
            'description' => (string) $announcement->description,
            'photo_url' => $announcement->photo_path ? asset('storage/' . $announcement->photo_path) : null,
            'is_active' => (bool) $announcement->is_active,
            'published_at' => optional($announcement->published_at ?? $announcement->created_at)?->toIso8601String(),
        ];
    }
}

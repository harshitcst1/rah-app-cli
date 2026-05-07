<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DaroodType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DaroodTypesAdminController extends Controller
{
    public function index(Request $request)
    {
        $u = Auth::user();
        if (!$u || !($u->is_admin ?? false)) {
            return response()->json(['ok' => false, 'error' => 'forbidden'], 403);
        }

        $q = DaroodType::query();
        if ($request->filled('active')) {
            $active = filter_var($request->get('active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($active !== null) $q->where('active', $active);
        }

        $types = $q->orderBy('sort_order')->orderBy('name')
            ->get(['id','name','active','sort_order','content_text','image_path']);

        return response()->json([
            'ok' => true,
            'items' => $types->map(fn($t) => [
                'id' => (int) $t->id,
                'name' => (string) $t->name,
                'active' => (bool) $t->active,
                'sort_order' => (int) ($t->sort_order ?? 0),
                'has_text' => !empty($t->content_text),
                'has_image' => !empty($t->image_path),
                'image_url' => $t->image_path ? asset('storage/'.$t->image_path) : null, // NEW
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $u = Auth::user();
        if (!$u || !($u->is_admin ?? false)) {
            return response()->json(['ok' => false, 'error' => 'forbidden'], 403);
        }

        $v = $request->validate([
            'name' => 'required|string|max:120',
            'short_desc' => 'nullable|string|max:200',
            'active' => 'sometimes|boolean',
            'sort_order' => 'nullable|integer|min:0|max:9999',
            'content_text' => 'nullable|string',
            'image' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        $slugBase = Str::slug($v['name']);
        $slug = $slugBase;
        $i = 1;
        while (DaroodType::where('slug', $slug)->exists()) {
            $slug = $slugBase . '-' . (++$i);
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('darood_types', 'public');
        }

        $t = DaroodType::create([
            'slug' => $slug,
            'name' => $v['name'],
            'short_desc' => $v['short_desc'] ?? null,
            'active' => (bool) ($v['active'] ?? false),
            'sort_order' => $v['sort_order'] ?? 0,
            'content_text' => $v['content_text'] ?? null,
            'image_path' => $imagePath,
        ]);

        return response()->json([
            'ok' => true,
            'item' => [
                'id' => (int) $t->id,
                'name' => (string) $t->name,
                'active' => (bool) $t->active,
                'sort_order' => (int) ($t->sort_order ?? 0),
                'has_text' => !empty($t->content_text),
                'has_image' => !empty($t->image_path),
            ],
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $u = Auth::user();
        if (!$u || !($u->is_admin ?? false)) {
            return response()->json(['ok' => false, 'error' => 'forbidden'], 403);
        }

        $t = DaroodType::find($id);
        if (!$t) return response()->json(['ok' => false, 'error' => 'not_found'], 404);

        $v = $request->validate([
            'name' => 'sometimes|required|string|max:120',
            'short_desc' => 'nullable|string|max:200',
            'active' => 'sometimes|boolean',
            'sort_order' => 'nullable|integer|min:0|max:9999',
            'content_text' => 'nullable|string',
            'image' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:2048',
            'remove_image' => 'sometimes|boolean',
        ]);

        if (isset($v['name']) && $v['name'] !== $t->name) {
            $slugBase = Str::slug($v['name']);
            $slug = $slugBase;
            $i = 1;
            while (DaroodType::where('slug', $slug)->where('id', '!=', $t->id)->exists()) {
                $slug = $slugBase . '-' . (++$i);
            }
            $t->slug = $slug;
            $t->name = $v['name'];
        }

        $t->short_desc = $v['short_desc'] ?? $t->short_desc;
        if (array_key_exists('active', $v)) $t->active = (bool) $v['active'];
        if (isset($v['sort_order'])) $t->sort_order = $v['sort_order'];
        if (array_key_exists('content_text', $v)) $t->content_text = $v['content_text'];

        if (!empty($v['remove_image']) && $t->image_path) {
            Storage::disk('public')->delete($t->image_path);
            $t->image_path = null;
        }
        if ($request->hasFile('image')) {
            if ($t->image_path) Storage::disk('public')->delete($t->image_path);
            $t->image_path = $request->file('image')->store('darood_types', 'public');
        }

        $t->save();

        return response()->json([
            'ok' => true,
            'item' => [
                'id' => (int) $t->id,
                'name' => (string) $t->name,
                'active' => (bool) $t->active,
                'sort_order' => (int) ($t->sort_order ?? 0),
                'has_text' => !empty($t->content_text),
                'has_image' => !empty($t->image_path),
            ],
        ]);
    }
}
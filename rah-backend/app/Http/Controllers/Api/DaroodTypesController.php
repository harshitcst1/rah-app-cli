<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DaroodType;

class DaroodTypesController extends Controller
{
    public function index()
    {
        $types = DaroodType::query()
            ->where('active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id','slug','name','short_desc','sort_order']);

        return response()->json(['ok' => true, 'types' => $types]);
    }
}
<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DaroodType extends Model
{
    protected $table = 'darood_types';

    protected $fillable = [
        'slug',
        'name',
        'short_desc',
        'active',
        'sort_order',
        'content_text',
        'image_path',
    ];

    protected $casts = [
        'active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
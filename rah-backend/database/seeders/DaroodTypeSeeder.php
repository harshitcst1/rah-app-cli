<?php


namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use App\Models\DaroodType;

class DaroodTypeSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['slug' => 'ibrahimi', 'name' => 'Darood Ibrahimi', 'short_desc' => 'Commonly recited in Salah', 'sort_order' => 1],
            ['slug' => 'tunjina',  'name' => 'Darood Tunjina',  'short_desc' => 'Relief and success',        'sort_order' => 2],
            ['slug' => 'taj',      'name' => 'Darood-e-Taj',    'short_desc' => 'A well-known salawat',       'sort_order' => 3],
            ['slug' => 'simple',   'name' => 'Simple Salawat',  'short_desc' => 'Allahumma salli…',           'sort_order' => 4],
        ];

        foreach ($items as $i) {
            DaroodType::updateOrCreate(['slug' => $i['slug']], $i + ['active' => true]);
        }
    }
}
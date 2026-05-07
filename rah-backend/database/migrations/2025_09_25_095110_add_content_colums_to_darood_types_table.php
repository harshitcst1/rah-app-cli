<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('darood_types', function (Blueprint $table) {
            if (!Schema::hasColumn('darood_types', 'content_text')) {
                $table->longText('content_text')->nullable()->after('short_desc'); // Darood text
            }
            if (!Schema::hasColumn('darood_types', 'image_path')) {
                $table->string('image_path')->nullable()->after('content_text');   // storage path to image
            }
        });
    }

    public function down(): void
    {
        Schema::table('darood_types', function (Blueprint $table) {
            if (Schema::hasColumn('darood_types', 'image_path')) {
                $table->dropColumn('image_path');
            }
            if (Schema::hasColumn('darood_types', 'content_text')) {
                $table->dropColumn('content_text');
            }
        });
    }
};

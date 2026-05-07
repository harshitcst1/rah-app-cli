<?php


use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('darood_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('darood_type_id')->constrained('darood_types')->restrictOnDelete();
            $table->unsignedInteger('count');
            $table->string('source', 16); // tap | manual
            $table->date('logged_at');    // date-only for streaks/today
            $table->timestamps();

            $table->index(['user_id','logged_at']);
            $table->index(['logged_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('darood_logs');
    }
};
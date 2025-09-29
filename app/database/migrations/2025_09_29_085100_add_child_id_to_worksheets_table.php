<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('worksheets', function (Blueprint $table) {
            if (! Schema::hasColumn('worksheets', 'child_id')) {
                $table->foreignId('child_id')
                    ->nullable()
                    ->after('created_by')
                    ->constrained('children')
                    ->nullOnDelete();

                $table->index(['child_id', 'created_at'], 'worksheets_child_created_index');
            }
        });
    }

    public function down(): void
    {
        Schema::table('worksheets', function (Blueprint $table) {
            if (Schema::hasColumn('worksheets', 'child_id')) {
                $table->dropIndex('worksheets_child_created_index');
                $table->dropConstrainedForeignId('child_id');
            }
        });
    }
};

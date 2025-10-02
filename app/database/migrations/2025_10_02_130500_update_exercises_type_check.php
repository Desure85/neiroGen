<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_type_check");

        DB::statement(<<<SQL
            ALTER TABLE exercises
            ADD CONSTRAINT exercises_type_check
            CHECK (type IN (
                'pronunciation',
                'articulation',
                'rhythm',
                'memory',
                'other',
                'graphic_dictation'
            ))
        SQL);
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_type_check");

        DB::statement(<<<SQL
            ALTER TABLE exercises
            ADD CONSTRAINT exercises_type_check
            CHECK (type IN (
                'pronunciation',
                'articulation',
                'rhythm',
                'memory',
                'other'
            ))
        SQL);
    }
};

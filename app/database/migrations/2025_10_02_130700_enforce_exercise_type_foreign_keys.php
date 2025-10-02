<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('exercise_types')) {
            return;
        }

        DB::statement(
            'UPDATE exercises e SET exercise_type_id = et.id '
            .'FROM exercise_types et '
            .'WHERE e.type = et.key AND (e.exercise_type_id IS NULL OR e.exercise_type_id <> et.id)'
        );

        DB::statement('ALTER TABLE exercises ALTER COLUMN exercise_type_id SET NOT NULL');

        DB::statement('ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_type_key_fk');

        DB::statement(
            'ALTER TABLE exercises '
            .'ADD CONSTRAINT exercises_type_key_fk '
            .'FOREIGN KEY (type) REFERENCES exercise_types(key) '
            .'ON UPDATE CASCADE ON DELETE RESTRICT'
        );
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_type_key_fk');
        DB::statement('ALTER TABLE exercises ALTER COLUMN exercise_type_id DROP NOT NULL');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('worksheets', function (Blueprint $table) {
            if (! Schema::hasColumn('worksheets', 'header_html')) {
                $table->text('header_html')->nullable()->after('worksheet_layout_id');
            }

            if (! Schema::hasColumn('worksheets', 'footer_html')) {
                $table->text('footer_html')->nullable()->after('header_html');
            }
        });
    }

    public function down(): void
    {
        Schema::table('worksheets', function (Blueprint $table) {
            if (Schema::hasColumn('worksheets', 'footer_html')) {
                $table->dropColumn('footer_html');
            }

            if (Schema::hasColumn('worksheets', 'header_html')) {
                $table->dropColumn('header_html');
            }
        });
    }
};

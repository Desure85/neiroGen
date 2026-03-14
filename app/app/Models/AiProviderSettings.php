<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiProviderSettings extends Model
{
    protected $table = 'ai_provider_settings';
    
    protected $fillable = [
        'provider',
        'api_key',
        'model',
        'enabled',
        'settings',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'settings' => 'array',
        'api_key' => 'encrypted',
    ];

    protected $hidden = [
        'api_key',
    ];

    public static function getConfig(string $provider): ?array
    {
        $settings = static::where('provider', $provider)->first();
        
        if (!$settings) {
            return null;
        }

        return [
            'enabled' => $settings->enabled,
            'api_key' => $settings->api_key,
            'model' => $settings->model,
            'settings' => $settings->settings,
        ];
    }

    public static function getAllConfigs(): array
    {
        $configs = [];
        $settings = static::all();
        
        foreach ($settings as $setting) {
            $configs[$setting->provider] = [
                'enabled' => $setting->enabled,
                'api_key' => $setting->api_key,
                'model' => $setting->model,
                'settings' => $setting->settings,
            ];
        }
        
        return $configs;
    }

    public static function setConfig(
        string $provider,
        ?string $apiKey = null,
        ?string $model = null,
        bool $enabled = false,
        ?array $settings = null
    ): self {
        $record = static::firstOrNew(['provider' => $provider]);
        
        if ($apiKey !== null) {
            $record->api_key = $apiKey;
        }
        if ($model !== null) {
            $record->model = $model;
        }
        if ($settings !== null) {
            $record->settings = $settings;
        }
        
        $record->enabled = $enabled;
        $record->save();
        
        return $record;
    }
}

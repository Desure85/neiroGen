<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Achievement Definitions
    |--------------------------------------------------------------------------
    |
    | Define all achievements available in the system.
    | Each achievement has:
    | - id: unique identifier
    | - name: display name (Russian)
    | - description: achievement description
    | - icon: icon identifier
    | - condition: type of condition to unlock
    | - requirement: value needed to unlock
    | - xp_reward: XP awarded when unlocked
    |
    */
    'achievements' => [
        // Exercise completion achievements
        [
            'id' => 'first_exercise',
            'name' => 'Первое задание',
            'description' => 'Выполнено первое задание',
            'icon' => 'star',
            'condition' => 'exercises_completed',
            'requirement' => 1,
            'xp_reward' => 5,
        ],
        [
            'id' => 'exercises_5',
            'name' => 'Начинающий',
            'description' => 'Выполнено 5 заданий',
            'icon' => 'rocket',
            'condition' => 'exercises_completed',
            'requirement' => 5,
            'xp_reward' => 10,
        ],
        [
            'id' => 'exercises_25',
            'name' => 'Труженик',
            'description' => 'Выполнено 25 заданий',
            'icon' => 'trophy',
            'condition' => 'exercises_completed',
            'requirement' => 25,
            'xp_reward' => 25,
        ],
        [
            'id' => 'exercises_100',
            'name' => 'Мастер',
            'description' => 'Выполнено 100 заданий',
            'icon' => 'crown',
            'condition' => 'exercises_completed',
            'requirement' => 100,
            'xp_reward' => 100,
        ],
        [
            'id' => 'exercises_500',
            'name' => 'Легенда',
            'description' => 'Выполнено 500 заданий',
            'icon' => 'medal',
            'condition' => 'exercises_completed',
            'requirement' => 500,
            'xp_reward' => 250,
        ],
        
        // Streak achievements
        [
            'id' => 'streak_3',
            'name' => 'Три дня подряд',
            'description' => '3 дня подряд занимался',
            'icon' => 'fire',
            'condition' => 'streak_days',
            'requirement' => 3,
            'xp_reward' => 15,
        ],
        [
            'id' => 'streak_7',
            'name' => 'Недельная серия',
            'description' => '7 дней подряд занимался',
            'icon' => 'flame',
            'condition' => 'streak_days',
            'requirement' => 7,
            'xp_reward' => 35,
        ],
        [
            'id' => 'streak_30',
            'name' => 'Месяц усердия',
            'description' => '30 дней подряд занимался',
            'icon' => 'lightning',
            'condition' => 'streak_days',
            'requirement' => 30,
            'xp_reward' => 150,
        ],
        
        // Level achievements
        [
            'id' => 'level_5',
            'name' => 'Пятый уровень',
            'description' => 'Достигнут 5 уровень',
            'icon' => 'star',
            'condition' => 'level',
            'requirement' => 5,
            'xp_reward' => 20,
        ],
        [
            'id' => 'level_10',
            'name' => 'Десятый уровень',
            'description' => 'Достигнут 10 уровень',
            'icon' => 'stars',
            'condition' => 'level',
            'requirement' => 10,
            'xp_reward' => 50,
        ],
        [
            'id' => 'level_25',
            'name' => 'Мастер-ученик',
            'description' => 'Достигнут 25 уровень',
            'icon' => 'gem',
            'condition' => 'level',
            'requirement' => 25,
            'xp_reward' => 125,
        ],
        
        // Time spent achievements
        [
            'id' => 'time_1hour',
            'name' => 'Час работы',
            'description' => 'Провел за заданиями 1 час',
            'icon' => 'clock',
            'condition' => 'time_spent',
            'requirement' => 3600, // seconds
            'xp_reward' => 25,
        ],
        [
            'id' => 'time_10hours',
            'name' => 'Десять часов',
            'description' => 'Провел за заданиями 10 часов',
            'icon' => 'hourglass',
            'condition' => 'time_spent',
            'requirement' => 36000,
            'xp_reward' => 100,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | XP Configuration
    |--------------------------------------------------------------------------
    */
    'xp' => [
        'base_per_exercise' => 10,
        'max_streak_bonus' => 10,
        'max_time_bonus' => 5,
    ],

    /*
    |--------------------------------------------------------------------------
    | Level Configuration
    |--------------------------------------------------------------------------
    */
    'level' => [
        'base_xp' => 100,
        'multiplier' => 1.5,
    ],

    /*
    |--------------------------------------------------------------------------
    | Avatar Themes
    |--------------------------------------------------------------------------
    */
    'avatar_themes' => [
        'default' => 'Стандартный',
        'space' => 'Космос',
        'ocean' => 'Океан',
        'forest' => 'Лес',
        'desert' => 'Пустыня',
        'fantasy' => 'Фэнтези',
    ],
];

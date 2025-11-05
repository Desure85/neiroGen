<?php

return [
    // Catalog of neuropsychological and speech therapy exercise types
    // Each type has: key, name, domain, icon, description, schema (fields), defaults

    'types' => [
        // Attention and memory
        'visual_memory' => [
            'name' => 'Визуальная память',
            'domain' => 'neuro',
            'icon' => '🖼️',
            'description' => 'Запоминание и воспроизведение изображений и последовательностей.',
            'schema' => [
                'cards_count' => ['type' => 'integer', 'min' => 2, 'max' => 20, 'default' => 6],
                'show_time_ms' => ['type' => 'integer', 'min' => 500, 'max' => 10000, 'default' => 3000],
                'recall_mode' => ['type' => 'enum', 'values' => ['order', 'free'], 'default' => 'order'],
            ],
        ],
        'auditory_memory' => [
            'name' => 'Слуховая память',
            'domain' => 'neuro',
            'icon' => '🎧',
            'description' => 'Запоминание звуковых последовательностей, слов.',
            'schema' => [
                'sequence_length' => ['type' => 'integer', 'min' => 2, 'max' => 9, 'default' => 4],
                'items_domain' => ['type' => 'enum', 'values' => ['digits', 'words', 'tones'], 'default' => 'digits'],
                'playback_speed' => ['type' => 'integer', 'min' => 50, 'max' => 300, 'default' => 120],
            ],
        ],
        'attention_sustained' => [
            'name' => 'Устойчивость внимания',
            'domain' => 'neuro',
            'icon' => '🎯',
            'description' => 'Поддержание концентрации на задании',
            'schema' => [
                'duration_sec' => ['type' => 'integer', 'min' => 30, 'max' => 600, 'default' => 120],
                'target_frequency' => ['type' => 'integer', 'min' => 1, 'max' => 30, 'default' => 5],
            ],
        ],
        'attention_selective' => [
            'name' => 'Избирательное внимание',
            'domain' => 'neuro',
            'icon' => '🔎',
            'description' => 'Выбор целевых стимулов среди отвлекающих',
            'schema' => [
                'distractors' => ['type' => 'integer', 'min' => 0, 'max' => 50, 'default' => 10],
                'targets' => ['type' => 'integer', 'min' => 1, 'max' => 20, 'default' => 5],
            ],
        ],
        'spatial_perception' => [
            'name' => 'Пространственное восприятие',
            'domain' => 'neuro',
            'icon' => '🧭',
            'description' => 'Ориентация в пространственных отношениях',
            'schema' => [
                'grid' => ['type' => 'enum', 'values' => ['2x2', '3x3', '4x4'], 'default' => '3x3'],
                'transformations' => ['type' => 'array_enum', 'values' => ['rotate', 'mirror', 'flip'], 'default' => ['rotate']],
            ],
        ],
        'visual_search' => [
            'name' => 'Визуальный поиск',
            'domain' => 'neuro',
            'icon' => '🔍',
            'description' => 'Поиск целевых элементов среди множества',
            'schema' => [
                'elements' => ['type' => 'integer', 'min' => 10, 'max' => 200, 'default' => 60],
                'targets' => ['type' => 'integer', 'min' => 1, 'max' => 10, 'default' => 3],
                'time_limit_sec' => ['type' => 'integer', 'min' => 0, 'max' => 600, 'default' => 0],
            ],
        ],
        'working_memory' => [
            'name' => 'Рабочая память',
            'domain' => 'neuro',
            'icon' => '🧠',
            'description' => 'Удержание и манипуляция информацией',
            'schema' => [
                'n_back' => ['type' => 'integer', 'min' => 1, 'max' => 3, 'default' => 1],
                'modality' => ['type' => 'enum', 'values' => ['visual', 'auditory', 'mixed'], 'default' => 'visual'],
            ],
        ],
        'executive_planning' => [
            'name' => 'Планирование (executive)',
            'domain' => 'neuro',
            'icon' => '🗺️',
            'description' => 'Планирование шагов для решения задачи',
            'schema' => [
                'steps' => ['type' => 'integer', 'min' => 2, 'max' => 10, 'default' => 4],
                'branching' => ['type' => 'boolean', 'default' => false],
            ],
        ],
        'inhibition_control' => [
            'name' => 'Тормозной контроль',
            'domain' => 'neuro',
            'icon' => '🛑',
            'description' => 'Задания на подавление импульсивного ответа (Go/NoGo)',
            'schema' => [
                'go_probability' => ['type' => 'number', 'min' => 0, 'max' => 1, 'default' => 0.7],
                'trials' => ['type' => 'integer', 'min' => 10, 'max' => 200, 'default' => 60],
            ],
        ],
        'cognitive_flexibility' => [
            'name' => 'Когнитивная гибкость',
            'domain' => 'neuro',
            'icon' => '🔀',
            'description' => 'Переключение правила/стимула (set-shifting)',
            'schema' => [
                'switch_frequency' => ['type' => 'integer', 'min' => 1, 'max' => 20, 'default' => 5],
                'stimuli' => ['type' => 'enum', 'values' => ['shapes', 'colors', 'numbers'], 'default' => 'colors'],
            ],
        ],
        'phoneme_discrimination' => [
            'name' => 'Различение фонем',
            'domain' => 'speech',
            'icon' => '🔊',
            'description' => 'Отличать схожие звуки речи',
            'schema' => [
                'pairs' => ['type' => 'integer', 'min' => 5, 'max' => 50, 'default' => 10],
                'contrast' => ['type' => 'enum', 'values' => ['place', 'manner', 'voicing'], 'default' => 'voicing'],
            ],
        ],
        'syllable_blending' => [
            'name' => 'Слияние слогов',
            'domain' => 'speech',
            'icon' => '🗣️',
            'description' => 'Собрать слово из слогов',
            'schema' => [
                'word_length' => ['type' => 'integer', 'min' => 2, 'max' => 6, 'default' => 3],
                'syllables_bank' => ['type' => 'enum', 'values' => ['simple', 'mixed'], 'default' => 'simple'],
            ],
        ],
        'sound_letter_mapping' => [
            'name' => 'Звук-буква',
            'domain' => 'speech',
            'icon' => '🔤',
            'description' => 'Соотнесение звуков и букв',
            'schema' => [
                'alphabet' => ['type' => 'enum', 'values' => ['ru', 'en'], 'default' => 'ru'],
                'items' => ['type' => 'integer', 'min' => 5, 'max' => 50, 'default' => 10],
            ],
        ],
        'articulation_gymnastics' => [
            'name' => 'Артикуляционная гимнастика',
            'domain' => 'speech',
            'icon' => '👅',
            'description' => 'Движения артикуляционного аппарата',
            'schema' => [
                'movements' => ['type' => 'array_enum', 'values' => ['tongue_up', 'tongue_down', 'lip_rounding', 'smile'], 'default' => ['tongue_up']],
                'tempo' => ['type' => 'enum', 'values' => ['slow', 'normal', 'fast'], 'default' => 'normal'],
            ],
        ],
        'rhythm_tapping' => [
            'name' => 'Ритмичное постукивание',
            'domain' => 'neuro',
            'icon' => '🥁',
            'description' => 'Воспроизведение ритмических паттернов',
            'schema' => [
                'bpm' => ['type' => 'integer', 'min' => 40, 'max' => 200, 'default' => 90],
                'pattern_complexity' => ['type' => 'enum', 'values' => ['easy', 'medium', 'hard'], 'default' => 'easy'],
            ],
        ],
        'sequence_ordering' => [
            'name' => 'Упорядочивание последовательностей',
            'domain' => 'neuro',
            'icon' => '🔢',
            'description' => 'Упорядочить карточки по логике',
            'schema' => [
                'items' => ['type' => 'integer', 'min' => 3, 'max' => 12, 'default' => 5],
                'theme' => ['type' => 'enum', 'values' => ['daily', 'seasonal', 'story'], 'default' => 'story'],
            ],
        ],
        'category_sorting' => [
            'name' => 'Классификация',
            'domain' => 'neuro',
            'icon' => '🗂️',
            'description' => 'Разложить по категориям',
            'schema' => [
                'categories' => ['type' => 'integer', 'min' => 2, 'max' => 6, 'default' => 3],
                'items' => ['type' => 'integer', 'min' => 6, 'max' => 60, 'default' => 12],
            ],
        ],
        'logic_matrices' => [
            'name' => 'Логические матрицы',
            'domain' => 'neuro',
            'icon' => '🧩',
            'description' => 'Завершить матрицу по правилу',
            'schema' => [
                'size' => ['type' => 'enum', 'values' => ['2x2', '3x3'], 'default' => '3x3'],
                'rules' => ['type' => 'array_enum', 'values' => ['shape', 'color', 'count', 'rotation'], 'default' => ['shape', 'color']],
            ],
        ],
        'trail_making' => [
            'name' => 'Соединение по порядку',
            'domain' => 'neuro',
            'icon' => '🧵',
            'description' => 'Соединить точки по порядку/правилу',
            'schema' => [
                'mode' => ['type' => 'enum', 'values' => ['A', 'B'], 'default' => 'A'],
                'points' => ['type' => 'integer', 'min' => 10, 'max' => 60, 'default' => 25],
            ],
        ],
        'pattern_copying' => [
            'name' => 'Копирование узоров',
            'domain' => 'neuro',
            'icon' => '📐',
            'description' => 'Воспроизвести образец',
            'schema' => [
                'library' => ['type' => 'enum', 'values' => ['basic', 'advanced'], 'default' => 'basic'],
                'attempts' => ['type' => 'integer', 'min' => 1, 'max' => 5, 'default' => 2],
            ],
        ],
        'graphic_dictation' => [
            'name' => 'Графический диктант',
            'domain' => 'neuro',
            'icon' => '📏',
            'description' => 'Построение изображения по пошаговым координатам на сетке.',
            'schema' => [
                'grid_width' => ['type' => 'integer', 'min' => 4, 'max' => 64, 'default' => 16],
                'grid_height' => ['type' => 'integer', 'min' => 4, 'max' => 64, 'default' => 16],
                'cell_size_mm' => ['type' => 'integer', 'min' => 5, 'max' => 20, 'default' => 10],
                'difficulty' => ['type' => 'enum', 'values' => ['easy', 'medium', 'hard'], 'default' => 'medium'],
                'allow_diagonals' => ['type' => 'boolean', 'default' => false],
                'source_image' => ['type' => 'string', 'default' => ''],
            ],
        ],
        'semantic_fluency' => [
            'name' => 'Семантическая беглость',
            'domain' => 'speech',
            'icon' => '🗃️',
            'description' => 'Назвать как можно больше слов по категории',
            'schema' => [
                'category' => ['type' => 'enum', 'values' => ['animals', 'fruits', 'transport'], 'default' => 'animals'],
                'time_sec' => ['type' => 'integer', 'min' => 10, 'max' => 180, 'default' => 60],
            ],
        ],
        'phonemic_fluency' => [
            'name' => 'Фонемная беглость',
            'domain' => 'speech',
            'icon' => '🔡',
            'description' => 'Слова на заданный звук/букву',
            'schema' => [
                'letter' => ['type' => 'string', 'default' => 'С'],
                'time_sec' => ['type' => 'integer', 'min' => 10, 'max' => 180, 'default' => 60],
            ],
        ],
        'story_recall' => [
            'name' => 'Пересказ истории',
            'domain' => 'speech',
            'icon' => '📖',
            'description' => 'Воспроизвести рассказ',
            'schema' => [
                'length' => ['type' => 'enum', 'values' => ['short', 'medium', 'long'], 'default' => 'short'],
                'cues' => ['type' => 'boolean', 'default' => true],
            ],
        ],
        'visual_motor_integration' => [
            'name' => 'Зрительно-моторная интеграция',
            'domain' => 'neuro',
            'icon' => '✍️',
            'description' => 'Координация зрения и движения',
            'schema' => [
                'trace_paths' => ['type' => 'boolean', 'default' => true],
                'complexity' => ['type' => 'enum', 'values' => ['easy', 'medium', 'hard'], 'default' => 'medium'],
            ],
        ],
        'emotional_recognition' => [
            'name' => 'Распознавание эмоций',
            'domain' => 'neuro',
            'icon' => '🙂',
            'description' => 'Определить эмоции по лицам/ситуациям',
            'schema' => [
                'set' => ['type' => 'enum', 'values' => ['basic', 'extended'], 'default' => 'basic'],
                'distractors' => ['type' => 'integer', 'min' => 0, 'max' => 10, 'default' => 2],
            ],
        ],
        'pattern_completion' => [
            'name' => 'Завершение паттерна',
            'domain' => 'neuro',
            'icon' => '🧩',
            'description' => 'Догадаться, что идёт дальше',
            'schema' => [
                'sequence_len' => ['type' => 'integer', 'min' => 3, 'max' => 12, 'default' => 5],
                'domains' => ['type' => 'array_enum', 'values' => ['shapes', 'numbers', 'colors'], 'default' => ['numbers']],
            ],
        ],
        'sound_localization' => [
            'name' => 'Локализация звука',
            'domain' => 'neuro',
            'icon' => '📡',
            'description' => 'Определить направление/источник звука',
            'schema' => [
                'channels' => ['type' => 'integer', 'min' => 2, 'max' => 8, 'default' => 2],
                'trials' => ['type' => 'integer', 'min' => 10, 'max' => 100, 'default' => 30],
            ],
        ],
        'picture_sequences' => [
            'name' => 'Картинные последовательности',
            'domain' => 'speech',
            'icon' => '🖼️',
            'description' => 'Собрать историю из картинок',
            'schema' => [
                'items' => ['type' => 'integer', 'min' => 3, 'max' => 10, 'default' => 4],
                'theme' => ['type' => 'enum', 'values' => ['daily', 'fairy', 'custom'], 'default' => 'daily'],
            ],
        ],

        // Behavioral / ABA therapy (поведенческие)
        'token_economy' => [
            'name' => 'Токенная экономика',
            'domain' => 'behavioral',
            'icon' => '🎟️',
            'description' => 'Подкрепление желательного поведения жетонами',
            'schema' => [
                'target_behaviors' => ['type' => 'integer', 'min' => 1, 'max' => 5, 'default' => 1],
                'tokens_per_reward' => ['type' => 'integer', 'min' => 1, 'max' => 50, 'default' => 5],
                'session_length_min' => ['type' => 'integer', 'min' => 5, 'max' => 60, 'default' => 15],
            ],
        ],
        'dtt_discrete_trial' => [
            'name' => 'Дискретные пробы (DTT)',
            'domain' => 'behavioral',
            'icon' => '🧪',
            'description' => 'Обучение навыкам через серию структурированных проб',
            'schema' => [
                'trials' => ['type' => 'integer', 'min' => 5, 'max' => 200, 'default' => 20],
                'prompt_level' => ['type' => 'enum', 'values' => ['none', 'gestural', 'model', 'verbal', 'physical'], 'default' => 'verbal'],
                'reinforcement' => ['type' => 'enum', 'values' => ['fixed', 'variable'], 'default' => 'fixed'],
            ],
        ],
        'shaping' => [
            'name' => 'Формирование (Shaping)',
            'domain' => 'behavioral',
            'icon' => '🧱',
            'description' => 'Постепенное приближение к целевому поведению',
            'schema' => [
                'steps' => ['type' => 'integer', 'min' => 2, 'max' => 20, 'default' => 5],
                'criteria' => ['type' => 'enum', 'values' => ['accuracy', 'latency', 'duration'], 'default' => 'accuracy'],
            ],
        ],
        'chaining' => [
            'name' => 'Цепочки (Chaining)',
            'domain' => 'behavioral',
            'icon' => '⛓️',
            'description' => 'Освоение последовательности навыков по шагам',
            'schema' => [
                'chain_type' => ['type' => 'enum', 'values' => ['forward', 'backward', 'total'], 'default' => 'forward'],
                'steps' => ['type' => 'integer', 'min' => 2, 'max' => 15, 'default' => 6],
            ],
        ],
        'matching_to_sample' => [
            'name' => 'Сопоставление с образцом (MTS)',
            'domain' => 'behavioral',
            'icon' => '🧩',
            'description' => 'Выбор соответствующего стимулу образца',
            'schema' => [
                'comparison_stimuli' => ['type' => 'integer', 'min' => 2, 'max' => 6, 'default' => 3],
                'delay_ms' => ['type' => 'integer', 'min' => 0, 'max' => 5000, 'default' => 0],
            ],
        ],
        'differential_reinforcement' => [
            'name' => 'Дифференцированное подкрепление',
            'domain' => 'behavioral',
            'icon' => '🎯',
            'description' => 'DRA/DRI/DRL техники снижения нежелательного поведения',
            'schema' => [
                'procedure' => ['type' => 'enum', 'values' => ['DRA', 'DRI', 'DRL'], 'default' => 'DRA'],
                'interval_sec' => ['type' => 'integer', 'min' => 5, 'max' => 600, 'default' => 60],
            ],
        ],
        'functional_communication_training' => [
            'name' => 'Функциональная коммуникация (FCT)',
            'domain' => 'behavioral',
            'icon' => '💬',
            'description' => 'Замещение проблемного поведения коммуникативным',
            'schema' => [
                'modality' => ['type' => 'enum', 'values' => ['verbal', 'gesture', 'aac'], 'default' => 'verbal'],
                'prompt_fading' => ['type' => 'boolean', 'default' => true],
            ],
        ],
        'social_stories' => [
            'name' => 'Социальные истории',
            'domain' => 'behavioral',
            'icon' => '📘',
            'description' => 'Обучение социальным сценариям через истории',
            'schema' => [
                'length' => ['type' => 'enum', 'values' => ['short', 'medium', 'long'], 'default' => 'short'],
                'pictograms' => ['type' => 'boolean', 'default' => true],
            ],
        ],
        'emotion_regulation' => [
            'name' => 'Регуляция эмоций',
            'domain' => 'behavioral',
            'icon' => '🧘',
            'description' => 'Навыки саморегуляции, дыхание/пауза/переключение',
            'schema' => [
                'techniques' => ['type' => 'array_enum', 'values' => ['breathing', 'pause', 'grounding'], 'default' => ['breathing']],
                'duration_sec' => ['type' => 'integer', 'min' => 30, 'max' => 600, 'default' => 120],
            ],
        ],
        'self_monitoring' => [
            'name' => 'Самоконтроль',
            'domain' => 'behavioral',
            'icon' => '📝',
            'description' => 'Отслеживание собственного поведения по чек-листу',
            'schema' => [
                'checklist_items' => ['type' => 'integer', 'min' => 3, 'max' => 20, 'default' => 5],
                'interval_sec' => ['type' => 'integer', 'min' => 30, 'max' => 900, 'default' => 120],
            ],
        ],
    ],
];

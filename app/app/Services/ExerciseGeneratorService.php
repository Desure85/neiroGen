<?php

namespace App\Services;

use App\Models\Exercise;
use Illuminate\Support\Collection;

use App\Factories\ExerciseContentFactory;

class ExerciseGeneratorService
{
    private ExerciseContentFactory $contentFactory;

    public function __construct(ExerciseContentFactory $contentFactory)
    {
        $this->contentFactory = $contentFactory;
    }
    private array $templates = [
        'pronunciation' => [
            'syllables' => ['ма', 'па', 'ба', 'да', 'га', 'ка', 'та', 'на', 'ла', 'са', 'за', 'ца', 'ча', 'ща', 'ра'],
            'words' => ['мама', 'папа', 'баба', 'дядя', 'тётя', 'собака', 'кошка', 'машина', 'дом', 'лес'],
            'phrases' => [
                'Мама мыла раму',
                'Папа чинит машину',
                'Бабушка печёт пироги',
                'Дедушка читает газету',
                'Собака лает громко'
            ]
        ],
        'articulation' => [
            'sounds' => ['р', 'л', 'с', 'з', 'ш', 'ж', 'ч', 'щ', 'ц'],
            'tongue_twisters' => [
                'Карл у Клары украл кораллы',
                'Шла Саша по шоссе',
                'Рыба в озере жила',
                'Четыре черепахи'
            ]
        ],
        'rhythm' => [
            'patterns' => ['та-та', 'там-там', 'дин-дон', 'бум-бах'],
            'sequences' => [
                ['short', 'long', 'short'],
                ['long', 'short', 'long', 'short'],
                ['short', 'short', 'long']
            ]
        ],
        'memory' => [
            'sequences' => [
                'numbers' => ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
                'colors' => ['красный', 'синий', 'зелёный', 'жёлтый', 'оранжевый'],
                'animals' => ['кот', 'собака', 'птица', 'рыба', 'заяц']
            ]
        ]
    ];

    private array $difficultyLevels = [
        'easy' => [
            'complexity' => 1,
            'items_count' => 3,
            'time_limit' => 30
        ],
        'medium' => [
            'complexity' => 2,
            'items_count' => 5,
            'time_limit' => 45
        ],
        'hard' => [
            'complexity' => 3,
            'items_count' => 7,
            'time_limit' => 60
        ]
    ];

    public function generateExercise(string $type, string $difficulty, ?array $customParams = null): Exercise
    {
        $content = $this->generateContent($type, $difficulty, $customParams);

        $exercise = Exercise::create([
            'title' => $this->generateTitle($type, $difficulty),
            'description' => $this->generateDescription($type),
            'content' => $content,
            'type' => $type,
            'difficulty' => $difficulty,
            'estimated_duration' => $this->difficultyLevels[$difficulty]['time_limit'],
            'tags' => $this->generateTags($type, $difficulty),
            'is_active' => true
        ]);

        // Создаем ContentBlock для каждого элемента
        $contentBlocks = $this->contentFactory->createContentBlocksFromExercise($exercise);

        // Привязываем ContentBlock к упражнению
        foreach ($contentBlocks as $index => $block) {
            $exercise->addContentBlock($block, [
                'order' => $index,
                'delay' => $exercise->content['display_time'] ?? 0
            ]);
        }

        return $exercise;
    }

    private function generateContent(string $type, string $difficulty, ?array $customParams): array
    {
        $level = $this->difficultyLevels[$difficulty];
        $baseContent = $this->getBaseContent($type, $level['items_count']);

        return [
            'type' => $type,
            'difficulty' => $difficulty,
            'items' => $baseContent,
            'instructions' => $this->getInstructions($type),
            'expected_results' => $this->getExpectedResults($type),
            'scoring_criteria' => $this->getScoringCriteria($type, $difficulty),
            'metadata' => [
                'generated_at' => now(),
                'version' => '1.0',
                'custom_params' => $customParams
            ]
        ];
    }

    private function getBaseContent(string $type, int $count): array
    {
        return match($type) {
            'pronunciation' => $this->generatePronunciationContent($count),
            'articulation' => $this->generateArticulationContent($count),
            'rhythm' => $this->generateRhythmContent($count),
            'memory' => $this->generateMemoryContent($count),
            default => $this->generateDefaultContent($count)
        };
    }

    private function generatePronunciationContent(int $count): array
    {
        $items = collect([]);
        // Mix of syllables, words, and phrases to form a flat items array
        $items = $items
            ->merge(collect($this->templates['pronunciation']['syllables'])->random(min($count, 5)))
            ->merge(collect($this->templates['pronunciation']['words'])->random(min($count, 5)));

        if ($items->count() < $count) {
            $items = $items->merge(collect($this->templates['pronunciation']['phrases'])->random(min($count - $items->count(), 3)));
        }

        return [
            'items' => $items->take($count)->values()->all(),
            'exercise_type' => 'pronunciation'
        ];
    }

    private function generateArticulationContent(int $count): array
    {
        $items = collect([])
            ->merge(collect($this->templates['articulation']['sounds'])->random(min($count, 5))->map(fn($s) => "Звук: $s"))
            ->merge(collect($this->templates['articulation']['tongue_twisters'])->random(min($count, 3)));

        return [
            'items' => $items->take($count)->values()->all(),
            'exercise_type' => 'articulation'
        ];
    }

    private function generateRhythmContent(int $count): array
    {
        $items = collect($this->templates['rhythm']['patterns'])->random(min($count, 5));
        if ($items instanceof \Illuminate\Support\Collection) {
            $items = $items->values();
        }
        $seq = collect($this->templates['rhythm']['sequences'])->random(min($count, 3))
            ->map(fn($arr) => implode('-', $arr));
        $merged = collect($items)->merge($seq)->take($count)->values()->all();

        return [
            'items' => $merged,
            'exercise_type' => 'rhythm'
        ];
    }

    private function generateMemoryContent(int $count): array
    {
        $sequenceType = collect(['numbers', 'colors', 'animals'])->random();
        $items = collect($this->templates['memory']['sequences'][$sequenceType])->random($count);

        return [
            'items' => $items->values()->all(),
            'exercise_type' => 'memory',
            'sequence_type' => $sequenceType,
            'display_time' => 3 // seconds per item
        ];
    }

    private function generateDefaultContent(int $count): array
    {
        return [
            'items' => array_map(fn($n) => (string)$n, range(1, $count)),
            'exercise_type' => 'other'
        ];
    }

    private function generateTitle(string $type, string $difficulty): string
    {
        $titles = [
            'pronunciation' => [
                'easy' => 'Простое произношение слогов',
                'medium' => 'Произношение слов и фраз',
                'hard' => 'Сложные звуковые комбинации'
            ],
            'articulation' => [
                'easy' => 'Базовая артикуляция',
                'medium' => 'Сложные звуки',
                'hard' => 'Скороговорки и фразы'
            ],
            'rhythm' => [
                'easy' => 'Простые ритмы',
                'medium' => 'Ритмические паттерны',
                'hard' => 'Комплексные ритмы'
            ],
            'memory' => [
                'easy' => 'Запоминание простых последовательностей',
                'medium' => 'Память и внимание',
                'hard' => 'Сложные мнемотехники'
            ]
        ];

        return $titles[$type][$difficulty] ?? 'Упражнение';
    }

    private function generateDescription(string $type): string
    {
        $descriptions = [
            'pronunciation' => 'Упражнения для развития правильного произношения звуков и слогов',
            'articulation' => 'Развитие артикуляционной моторики и четкости речи',
            'rhythm' => 'Упражнения для развития чувства ритма и темпа речи',
            'memory' => 'Развитие памяти, внимания и когнитивных способностей'
        ];

        return $descriptions[$type] ?? 'Комплексное упражнение для развития речи';
    }

    private function getInstructions(string $type): array
    {
        return match($type) {
            'pronunciation' => [
                'Повторяйте за диктором',
                'Говорите четко и громко',
                'Следите за правильным произношением'
            ],
            'articulation' => [
                'Произносите звуки четко',
                'Повторяйте скороговорки медленно',
                'Увеличивайте скорость постепенно'
            ],
            'rhythm' => [
                'Слушайте ритм внимательно',
                'Повторяйте в том же темпе',
                'Соблюдайте паузы между звуками'
            ],
            'memory' => [
                'Внимательно запоминайте последовательность',
                'Повторяйте в правильном порядке',
                'Не торопитесь'
            ],
            default => ['Следуйте инструкциям на экране']
        };
    }

    private function getExpectedResults(string $type): array
    {
        return match($type) {
            'pronunciation' => [
                'Четкое произношение всех звуков',
                'Правильная артикуляция',
                'Гладкая речь без запинок'
            ],
            'articulation' => [
                'Ясность произношения',
                'Правильное положение органов речи',
                'Отсутствие дефектов звукопроизношения'
            ],
            'rhythm' => [
                'Соблюдение ритмического паттерна',
                'Правильный темп речи',
                'Четкие паузы'
            ],
            'memory' => [
                'Правильное воспроизведение последовательности',
                'Полное запоминание всех элементов',
                'Концентрация внимания'
            ],
            default => ['Выполнение задания согласно инструкции']
        };
    }

    private function getScoringCriteria(string $type, string $difficulty): array
    {
        $level = $this->difficultyLevels[$difficulty];

        return [
            'accuracy_weight' => 0.6,
            'speed_weight' => 0.2,
            'completeness_weight' => 0.2,
            'min_accuracy' => $level['complexity'] * 0.7,
            'time_bonus' => $level['time_limit'] * 0.8,
            'difficulty_multiplier' => $level['complexity']
        ];
    }

    private function generateTags(string $type, string $difficulty): array
    {
        $baseTags = ['generated', $type, $difficulty];
        $additionalTags = match($type) {
            'pronunciation' => ['speech', 'sounds', 'syllables'],
            'articulation' => ['articulation', 'tongue', 'sounds'],
            'rhythm' => ['rhythm', 'tempo', 'timing'],
            'memory' => ['memory', 'attention', 'cognition'],
            default => ['basic', 'speech-therapy']
        };

        return array_merge($baseTags, $additionalTags);
    }

    public function generateBatch(int $count, array $params): Collection
    {
        $exercises = collect();

        for ($i = 0; $i < $count; $i++) {
            $type = $params['types'][array_rand($params['types'])];
            $difficulty = $params['difficulties'][array_rand($params['difficulties'])];

            $exercises->push($this->generateExercise($type, $difficulty, $params['custom_params'] ?? null));
        }

        return $exercises;
    }
}

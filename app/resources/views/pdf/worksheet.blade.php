<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Worksheet</title>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            font-family: DejaVu Sans, sans-serif;
            margin: 18px;
            color: #1b1b1b;
        }
        h1 {
            font-size: 18px;
            margin-bottom: 12px;
        }
        h2 {
            font-size: 16px;
            margin: 10px 0 6px 0;
        }
        .exercise {
            border: 1px solid #cccccc;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 12px;
        }
        .meta {
            font-size: 12px;
            color: #555555;
            margin-bottom: 6px;
        }
        .instructions {
            margin-top: 8px;
            font-size: 12px;
        }
        .instructions li {
            margin-bottom: 4px;
        }
        .copy-divider {
            page-break-after: always;
        }
        .copy-divider:last-child {
            page-break-after: auto;
        }
    </style>
</head>
<body>
    <h1>Печатный лист занятий (формат {{ $format }})</h1>

    @for ($copy = 1; $copy <= $copies; $copy++)
        <div>
            <div class="meta">
                Экземпляр {{ $copy }} из {{ $copies }} · Дата: {{ now()->format('d.m.Y') }}
            </div>

            @foreach ($exercises as $exercise)
                <div class="exercise">
                    <h2>{{ $exercise->title }}</h2>
                    <div class="meta">
                        Тип: {{ $exercise->type }} · Сложность: {{ $exercise->difficulty }} · Длительность: {{ $exercise->estimated_duration }} мин
                    </div>

                    @if (!empty($exercise->description))
                        <p>{{ $exercise->description }}</p>
                    @endif

                    @php
                        $content = $exercise->content ?? [];
                        $instructions = $content['instructions'] ?? [];
                        $blocks = $content['blocks'] ?? [];
                    @endphp

                    @if (!empty($instructions))
                        <div class="instructions">
                            <strong>Инструкции:</strong>
                            <ol>
                                @foreach ($instructions as $instruction)
                                    <li>{{ $instruction }}</li>
                                @endforeach
                            </ol>
                        </div>
                    @endif

                    @if (!empty($blocks))
                        <div class="instructions">
                            <strong>Контентные блоки:</strong>
                            <ol>
                                @foreach ($blocks as $block)
                                    <li>{{ $block['title'] ?? ('Блок #' . ($loop->index + 1)) }} ({{ $block['type'] ?? 'тип отсутствует' }})</li>
                                @endforeach
                            </ol>
                        </div>
                    @endif
                </div>
            @endforeach
        </div>

        @if ($copy < $copies)
            <div class="copy-divider"></div>
        @endif
    @endfor
</body>
</html>

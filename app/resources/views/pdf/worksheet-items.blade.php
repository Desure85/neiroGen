<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>{{ $worksheet->title ?? 'Worksheet' }}</title>
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
            font-size: 20px;
            margin-bottom: 8px;
        }
        h2 {
            font-size: 16px;
            margin: 12px 0 6px 0;
        }
        .worksheet-header {
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 2px solid #4a90d9;
        }
        .meta {
            font-size: 12px;
            color: #555555;
            margin-bottom: 6px;
        }
        .child-info {
            font-size: 14px;
            color: #333;
            margin-bottom: 8px;
        }
        .exercise {
            border: 1px solid #cccccc;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 16px;
            page-break-inside: avoid;
        }
        .exercise-number {
            font-weight: bold;
            font-size: 14px;
            color: #4a90d9;
            margin-bottom: 4px;
        }
        .exercise-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 6px;
        }
        .instructions {
            margin-top: 8px;
            font-size: 12px;
            line-height: 1.5;
        }
        .instructions li {
            margin-bottom: 4px;
        }
        .content-block {
            background: #f9f9f9;
            padding: 10px;
            margin: 8px 0;
            border-radius: 4px;
            border-left: 3px solid #4a90d9;
        }
        .content-block-title {
            font-weight: bold;
            font-size: 12px;
            color: #666;
        }
        .content-block-content {
            margin-top: 6px;
            font-size: 11px;
        }
        .empty-space {
            border: 1px dashed #ccc;
            height: 150px;
            margin: 10px 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #999;
            font-size: 12px;
        }
        .copy-divider {
            page-break-after: always;
        }
        .copy-divider:last-child {
            page-break-after: auto;
        }
        .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            font-size: 10px;
            color: #888;
            text-align: center;
        }
    </style>
</head>
<body>
    @for ($copy = 1; $copy <= $copies; $copy++)
        <div>
            <div class="worksheet-header">
                <h1>{{ $worksheet->title ?? 'Печатный лист занятий' }}</h1>
                
                @if($worksheet->child)
                    <div class="child-info">
                        <strong>Ребёнок:</strong> {{ $worksheet->child->name }}
                        @if($worksheet->child->age)
                            (возраст: {{ $worksheet->child->age }} лет)
                        @endif
                    </div>
                @endif
                
                <div class="meta">
                    Формат: {{ $format }} · Экземпляр {{ $copy }} из {{ $copies }} · Дата: {{ now()->format('d.m.Y') }}
                </div>
                
                @if($worksheet->notes)
                    <div class="meta" style="margin-top: 8px;">
                        <strong>Notes:</strong> {{ $worksheet->notes }}
                    </div>
                @endif
            </div>

            @foreach ($items as $index => $item)
                <div class="exercise">
                    <div class="exercise-number">Задание {{ $index + 1 }}</div>
                    <div class="exercise-title">{{ $item->title }}</div>
                    
                    @php
                        $content = $item->content_snapshot ?? [];
                        $instructions = $item->instructions ?? [];
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
                        @foreach ($blocks as $block)
                            <div class="content-block">
                                <div class="content-block-title">
                                    {{ $block['title'] ?? ('Блок ' . ($loop->index + 1)) }}
                                    <span style="color: #999; font-weight: normal;">({{ $block['type'] ?? 'тип отсутствует' }})</span>
                                </div>
                                @if(!empty($block['content']))
                                    <div class="content-block-content">
                                        {{ is_array($block['content']) ? json_encode($block['content']) : $block['content'] }}
                                    </div>
                                @endif
                            </div>
                        @endforeach
                    @endif
                    
                    {{-- Empty space for child's work --}}
                    <div class="empty-space">
                        Место для выполнения задания
                    </div>
                </div>
            @endforeach
            
            <div class="footer">
                Страница {{ $copy }} из {{ $copies }} · neiroGen
            </div>
        </div>

        @if ($copy < $copies)
            <div class="copy-divider"></div>
        @endif
    @endfor
</body>
</html>

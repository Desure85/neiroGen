# Графический диктант: JSON формат

## Обзор

Графический диктант теперь хранится в виде JSON-структуры, содержащей сетку, стартовую точку, последовательность точек и готовые команды. Рендеринг и визуализация выполняются на клиенте или при печати.

## Формат данных

```json
{
  "grid": {
    "width": 16,
    "height": 16,
    "cell_size_mm": 10
  },
  "start": {
    "row": 0,
    "col": 0
  },
  "points": [
    { "row": 0, "col": 0 },
    { "row": 0, "col": 3 },
    { "row": 3, "col": 3 }
  ],
  "commands": [
    { "action": "draw", "direction": "right", "steps": 3 },
    { "action": "draw", "direction": "down", "steps": 3 }
  ]
}
```

## Поля

### `grid`
- **`width`** (integer, 4-64): ширина сетки в ячейках.
- **`height`** (integer, 4-64): высота сетки в ячейках.
- **`cell_size_mm`** (integer, 5-20): размер одной ячейки в миллиметрах.

### `start`
- **`row`** (integer, ≥0): начальная строка (индекс с 0).
- **`col`** (integer, ≥0): начальный столбец (индекс с 0).

### `points`
Массив точек, через которые проходит линия диктанта. Каждая точка:
- **`row`** (integer, ≥0): строка.
- **`col`** (integer, ≥0): столбец.

### `commands`
Массив команд для выполнения диктанта. Каждая команда:
- **`action`** (string): `"move"` (перемещение без рисования) или `"draw"` (рисование линии).
- **`direction`** (string, optional): направление (`"up"`, `"down"`, `"left"`, `"right"`, `"up-right"`, `"up-left"`, `"down-right"`, `"down-left"`).
- **`steps`** (integer, optional): количество шагов в данном направлении.

## API эндпоинты

### `POST /api/generator/graphic-dictation/validate`
Валидирует payload графического диктанта.

**Request:**
```json
{
  "grid": { "width": 16, "height": 16, "cell_size_mm": 10 },
  "start": { "row": 0, "col": 0 },
  "points": [{ "row": 0, "col": 0 }]
}
```

**Response (200):**
```json
{
  "valid": true,
  "payload": { ... }
}
```

**Response (422):**
```json
{
  "valid": false,
  "errors": { ... }
}
```

### `POST /api/generator/graphic-dictation/generate-commands`
Генерирует команды из массива точек.

**Request:**
```json
{
  "points": [
    { "row": 0, "col": 0 },
    { "row": 0, "col": 3 }
  ],
  "allow_diagonals": false
}
```

**Response (200):**
```json
{
  "commands": [
    { "action": "draw", "direction": "right", "steps": 3 }
  ]
}
```

### `POST /api/generator/graphic-dictation/create-template`
Создаёт пустой шаблон графического диктанта.

**Request (optional):**
```json
{
  "width": 20,
  "height": 20,
  "cell_size_mm": 8
}
```

**Response (200):**
```json
{
  "grid": { "width": 20, "height": 20, "cell_size_mm": 8 },
  "start": { "row": 0, "col": 0 },
  "points": [{ "row": 0, "col": 0 }],
  "commands": []
}
```

## Использование

1. **Создание диктанта**: используйте редактор (`GraphicDictationEditor`) для добавления точек на сетке.
2. **Генерация команд**: вызовите `/generate-commands` с массивом точек.
3. **Сохранение**: сохраните JSON в поле `content` или `payload` упражнения.
4. **Рендеринг**: клиентское приложение читает JSON и рисует сетку/линии на canvas/SVG при отображении или печати.

## Миграция

Старые задания с Go-пайплайном (шардинг, очереди, рендер SVG/PNG) больше не поддерживаются. Все новые диктанты создаются и хранятся в JSON-формате.

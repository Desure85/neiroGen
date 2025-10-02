---
title: "Реестр типов упражнений"
---

# Обзор

Справочник типов упражнений теперь хранится в БД (`exercise_types` и `exercise_type_fields`) и доступен через REST API. Фронтенд-компоненты `frontend/src/components/exercise-generator-new.tsx` и `frontend/src/components/worksheets/worksheet-generator.tsx` используют этот API для загрузки списка типов и их полей.

# API

## Получение списка типов

`GET /api/exercise-types`

```json
[
  {
    "id": 1,
    "key": "pronunciation",
    "name": "Произношение",
    "domain": "speech",
    "icon": "🗣️",
    "description": "Упражнения для постановки звуков",
    "is_active": true,
    "display_order": 10
  }
]
```

- Результат возвращается как массив (или в поле `data`, если ответ сформирован через ресурс).
- Только активные записи (`is_active = true`) должны использоваться на клиенте.

## Получение типа с полями

`GET /api/admin/exercise-types/{id}` (требует `auth:sanctum` + роль admin)

Ответ содержит структуру вида:

```json
{
  "id": 1,
  "key": "pronunciation",
  "name": "Произношение",
  "fields": [
    {
      "id": 11,
      "key": "syllables",
      "label": "Слоги",
      "field_type": "array",
      "is_required": true,
      "default_value": [],
      "options": null,
      "help_text": "Набор слогов для тренировки"
    }
  ]
}
```

# Фронтенд

## Генератор упражнений

Компонент `ExerciseGenerator` (`frontend/src/components/exercise-generator-new.tsx`):

- При монтировании вызывает `fetchExerciseTypes()` из `frontend/src/lib/api.ts`.
- Кэширует результат на стороне клиента, фильтрует только активные типы и отсортирует по `display_order`.
- Передаёт массив ключей в `POST /api/generator/generate-batch` (`types: ["pronunciation"]`).

## Конструктор рабочих листов

Компонент `WorksheetGenerator` (`frontend/src/components/worksheets/worksheet-generator.tsx`):

- Загружает упражнения (`/api/exercises`) и словарь типов (`fetchExerciseTypes()`).
- Отображает человекочитаемые названия в фильтрах и карточках, используя `exercise.exerciseType` или `exercise.exercise_type_id`.
- Показывает ошибку загрузки словаря в UI (`<Alert variant="destructive">`).

# Администрирование

- Управление типами доступно через админ-панель `frontend/src/app/admin/exercise-types/`.
- CRUD эндпоинты: `POST /api/admin/exercise-types`, `PUT /api/admin/exercise-types/{id}`, `DELETE /api/admin/exercise-types/{id}`.
- Для добавления пользовательских полей используйте `POST /api/admin/exercise-types/{id}/fields`.

# Миграции и сиды

- Таблицы определены миграциями в `app/database/migrations/**/create_exercise_types_table.php` и `...exercise_type_fields_table.php`.
- Начальные данные можно загрузить сидером `ExerciseTypeSeeder`.

# Проверки

После изменения схемы или словаря рекомендуется прогнать:

```
docker compose exec frontend npm run lint
docker compose exec frontend npm run test
docker compose exec app php artisan test
docker compose exec app vendor/bin/phpstan analyse
```

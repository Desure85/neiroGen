---
description: drag-and-drop сортировка полей типа упражнения в админке
---

1. Перейди в `frontend/` и установи пакет DnD
   ```bash
   npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/accessibility
   ```
2. Обнови `frontend/src/app/admin/exercise-types/[id]/page.tsx`
   - Импортируй провайдеры `DndContext`, `SortableContext`, `arrayMove`, датчики `PointerSensor`, `KeyboardSensor`, и др.
   - Оберни таблицу полей в `DndContext` + `SortableContext`.
   - Используй `useSensor`/`useSensors` и `closestCenter`.
   - Создай `SortableRow` компонент для строки поля.
   - Обнови `handleReorder` на работу с `@dnd-kit/sortable`.
3. Добавь стили перетаскивания (например, `transform`, `transition`).
4. Покрой drag&drop unit-тестом или e2e (по возможности).

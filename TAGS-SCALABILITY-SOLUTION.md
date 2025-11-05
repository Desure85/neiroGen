# 🏷️ Решение проблем с тегами

**Дата:** 5 ноября 2025  
**Статус:** UI улучшен, backend требуется

---

## 🐛 Проблема 1: Теги не сохраняются

### Почему не сохраняются?

**Та же причина, что и с файлами** - Mock данные в памяти:

```typescript
const addTag = (fileId: string, tag: string) => {
  setFiles(prev => prev.map(f => {  // ← Обновляет state в памяти!
    if (f.id === fileId) {
      return { ...f, tags: [...existingTags, tag] }
    }
    return f
  }))
}
```

**Данные теряются при:**
- Перезагрузке страницы
- Смене вкладки "Файлы"
- Выходе из системы

---

## ⚠️ Проблема 2: Что делать с сотней тегов?

### Было (до улучшений):

```tsx
{allTags.map(tag => <Badge>{tag}</Badge>)}  // ← Все 100 тегов в одну линию! 💥
```

**Проблемы:**
- UI ломается при 10+ тегах
- Невозможно найти нужный тег
- Долгая загрузка DOM
- Плохой UX

---

## ✅ Решение: Scalable UI (Реализовано!)

### 1. Ограничение видимых тегов

**Показываем только 10 тегов, остальные скрыты:**

```tsx
const visibleTags = showAllTags ? allTags : allTags.slice(0, 10)

{visibleTags.map(tag => <Badge>{tag}</Badge>)}

{allTags.length > 10 && (
  <Button onClick={() => setShowAllTags(!showAllTags)}>
    {showAllTags ? 'Скрыть' : `+${allTags.length - 10} ещё`}
  </Button>
)}
```

**Результат:**
- ✅ Показано: 10 тегов
- ✅ Кнопка: "+90 ещё"
- ✅ Клик → показать все

---

### 2. Поиск по тегам

**Для быстрого поиска среди множества тегов:**

```tsx
{allTags.length > 10 && (
  <Input
    placeholder="Поиск тегов..."
    value={tagSearchQuery}
    onChange={(e) => setTagSearchQuery(e.target.value)}
  />
)}

const filteredTags = tagSearchQuery
  ? allTags.filter(tag => tag.toLowerCase().includes(tagSearchQuery.toLowerCase()))
  : allTags
```

**Результат:**
- ✅ Поле поиска появляется если > 10 тегов
- ✅ Фильтрация в реальном времени
- ✅ Case-insensitive поиск

---

### 3. Autocomplete при добавлении

**Предлагаем существующие теги:**

```tsx
{/* Когда пользователь вводит текст */}
{newTag.length > 0 && (
  <div>
    <span>Похожие:</span>
    {allTags
      .filter(t => t.toLowerCase().includes(newTag.toLowerCase()))
      .slice(0, 5)
      .map(tag => (
        <Badge onClick={() => addTag(file.id, tag)}>
          {tag}
        </Badge>
      ))}
  </div>
)}

{/* Когда поле пустое - показываем частые теги */}
{newTag.length === 0 && (
  <div>
    <span>Частые:</span>
    {allTags.slice(0, 5).map(tag => (
      <Badge onClick={() => addTag(file.id, tag)}>
        {tag}
      </Badge>
    ))}
  </div>
)}
```

**Результат:**
- ✅ Подсказки при вводе
- ✅ Клик на Badge → тег добавлен
- ✅ Предлагаются частые теги
- ✅ Исключаются уже добавленные теги

---

## 📊 Улучшенный UI

### Фильтр тегов (главная панель)

**Было:**
```
🏷️ Фильтр по тегам:
[тег1] [тег2] [тег3] ... [тег100]  ← Катастрофа!
```

**Стало:**
```
🏷️ Фильтр по тегам (100):        [Поиск тегов...    ]

[тег1] [тег2] [тег3] [тег4] [тег5]
[тег6] [тег7] [тег8] [тег9] [тег10]

[+90 ещё]  [Очистить]
```

**Клик "+90 ещё":**
```
[тег1] [тег2] ... [тег100]

[Скрыть]  [Очистить]
```

### Tag Editor (в карточке файла)

**Было:**
```
Новый тег: [_________] [+]

Теги файла: [тег1 ×] [тег2 ×]
```

**Стало:**
```
Новый тег или выберите ниже: [артикул____] [+]

Похожие: [артикуляция] [артикуляционный]

Теги файла: [звук-р ×] [произношение ×]
```

**Если поле пустое:**
```
Новый тег или выберите ниже: [_________] [+]

Частые: [артикуляция] [дифференциация] [звук-л] [звук-р] [картинка]

Теги файла: [звук-р ×] [произношение ×]
```

---

## 🔧 Backend API для сохранения

### Таблица в БД

```sql
CREATE TABLE file_tags (
  id UUID PRIMARY KEY,
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(file_id, tag)
);

CREATE INDEX idx_file_tags_file_id ON file_tags(file_id);
CREATE INDEX idx_file_tags_tag ON file_tags(tag);
```

### API Endpoints

```php
// 1. Добавить тег
POST /api/files/{fileId}/tags
{
  "tag": "артикуляция"
}
Response: 201 Created

// 2. Удалить тег
DELETE /api/files/{fileId}/tags/{tag}
Response: 204 No Content

// 3. Получить частые теги (для autocomplete)
GET /api/files/tags/popular
?limit=10
Response: ["артикуляция", "звук-р", ...]

// 4. Поиск тегов
GET /api/files/tags/search
?q=арт
Response: ["артикуляция", "артикуляционный"]
```

### Frontend интеграция

**Заменить в file-manager.tsx:**

```typescript
const addTag = async (fileId: string, tag: string) => {
  if (!tag.trim()) return
  
  try {
    const response = await apiFetch(`/api/files/${fileId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag })
    })
    
    if (response.ok) {
      // Обновить локальный state
      setFiles(prev => prev.map(f => {
        if (f.id === fileId) {
          const existingTags = f.tags || []
          if (existingTags.includes(tag)) return f
          return { ...f, tags: [...existingTags, tag] }
        }
        return f
      }))
      setNewTag('')
    }
  } catch (error) {
    console.error('Failed to add tag:', error)
    toast({ title: 'Ошибка добавления тега', variant: 'destructive' })
  }
}

const removeTag = async (fileId: string, tag: string) => {
  try {
    const response = await apiFetch(`/api/files/${fileId}/tags/${encodeURIComponent(tag)}`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      setFiles(prev => prev.map(f => {
        if (f.id === fileId) {
          return { ...f, tags: f.tags?.filter(t => t !== tag) || [] }
        }
        return f
      }))
    }
  } catch (error) {
    console.error('Failed to remove tag:', error)
    toast({ title: 'Ошибка удаления тега', variant: 'destructive' })
  }
}
```

---

## 🎯 Дополнительные улучшения (опционально)

### 1. Категории тегов

**Для структурирования большого количества:**

```typescript
const TAG_CATEGORIES = {
  'Звуки': ['звук-р', 'звук-л', 'звук-ш', 'звук-с'],
  'Типы': ['артикуляция', 'дифференциация', 'произношение'],
  'Медиа': ['картинка', 'аудио', 'видео'],
}

// В UI
{Object.entries(TAG_CATEGORIES).map(([category, tags]) => (
  <div>
    <h4>{category}</h4>
    {tags.map(tag => <Badge>{tag}</Badge>)}
  </div>
))}
```

### 2. Цветные теги

**Визуальное разделение:**

```typescript
const TAG_COLORS = {
  'звук-р': 'bg-red-100',
  'звук-л': 'bg-blue-100',
  'артикуляция': 'bg-green-100',
}

<Badge className={TAG_COLORS[tag]}>{tag}</Badge>
```

### 3. Популярность тегов

**Показывать счётчик использований:**

```sql
SELECT tag, COUNT(*) as count
FROM file_tags
GROUP BY tag
ORDER BY count DESC
LIMIT 10;
```

```tsx
<Badge>
  артикуляция
  <span className="ml-1 text-xs opacity-70">(42)</span>
</Badge>
```

### 4. Синонимы тегов

**Автоматическое объединение:**

```typescript
const TAG_SYNONYMS = {
  'звук-р': ['р', 'звук р', 'буква-р'],
  'артикуляция': ['артикул', 'арт'],
}
```

---

## ✅ Что сделано

- ✅ **Ограничение отображения** - показываем 10, скрываем остальные
- ✅ **Кнопка "Показать ещё"** - разворачивает все теги
- ✅ **Поиск по тегам** - фильтрация в реальном времени
- ✅ **Autocomplete** - предлагает похожие теги при вводе
- ✅ **Частые теги** - показывает популярные для быстрого выбора
- ✅ **Счётчик тегов** - "Фильтр по тегам (42)"
- ✅ **Исключение дубликатов** - не предлагает уже добавленные

---

## ❌ Что НЕ работает (нужен backend)

- ❌ Сохранение тегов между сессиями
- ❌ Синхронизация между пользователями
- ❌ Популярность тегов (сортировка по частоте)
- ❌ Статистика использования

---

## 🧪 Как протестировать

### 1. Проверить ограничение тегов:

```
1. Открыть "Файлы"
2. Увидеть "Фильтр по тегам (N)"
3. Если N > 10:
   - Показано только 10 тегов
   - Кнопка "+X ещё"
   - Поле поиска справа
4. Клик "+X ещё" → показать все
```

### 2. Проверить поиск:

```
1. Ввести в поле поиска: "звук"
2. Видны только теги содержащие "звук"
3. Остальные скрыты
```

### 3. Проверить autocomplete:

```
1. Открыть карточку файла
2. Клик на "+"  для добавления тега
3. Начать вводить: "арт"
4. Увидеть "Похожие: [артикуляция] [артикуляционный]"
5. Клик на предложенный тег → он добавлен
```

### 4. Проверить частые теги:

```
1. Открыть Tag Editor (поле пустое)
2. Увидеть "Частые: [тег1] [тег2] ..."
3. Клик на тег → добавлен к файлу
```

---

## 📝 Резюме

### Проблема с сохранением:
**Причина:** Mock данные в React state  
**Решение:** Backend API + БД

### Проблема со множеством тегов:
**Причина:** Все теги в одну линию  
**Решение:** ✅ **Реализовано!**
- Ограничение (10 видимых)
- Поиск
- Autocomplete
- Частые теги

### Рекомендации:
1. **Для демо** - текущая реализация достаточна
2. **Для продакшена** - добавить Backend API
3. **Для масштаба** - категории тегов, цвета, синонимы

**UI готов к работе с сотней тегов! 🎉**

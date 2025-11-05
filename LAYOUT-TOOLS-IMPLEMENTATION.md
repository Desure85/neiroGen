# 🛠️ Реализация профессиональных инструментов для макета

**Дата:** 5 ноября 2025  
**Статус:** ✅ MVP реализован (кнопки добавлены)

---

## ✅ Что сделано

### 1. Исследование
**Файл:** `docs/LAYOUT-TOOLS-RESEARCH.md`

Проведен анализ потребностей логопедов и нейропсихологов:
- Изучены типы упражнений
- Определены Must Have инструменты
- Создан план реализации

### 2. Типы элементов
**Файл:** `worksheet-layout-types.ts`

Добавлены новые типы:
```typescript
export type CanvasElementType = 
  | 'line'        // Линия (прямая)
  | 'arrow'       // Стрелка  
  | 'circle'      // Круг
  | 'rectangle'   // Прямоугольник
  | 'number'      // Номер/метка
```

Добавлены свойства:
```typescript
x2?: number          // Конечная точка для line, arrow
y2?: number
radius?: number      // Радиус для circle  
numberValue?: number // Значение для number
arrowDirection?: 'up' | 'down' | 'left' | 'right' | 'custom'
```

### 3. UI кнопки
**Файл:** `worksheet-layout-canvas.tsx`

Добавлены кнопки с группировкой:

**Базовые:**
- [T Текст]
- [📝 Инструкции]
- [📐 Сетка] (для граф.диктанта)
- [🖼️ Изображение]

**Инструменты:**
- [— Линия]
- [→ Стрелка]
- [○ Круг]
- [□ Прямоугольник]
- [# Номер]

---

## 🔧 Что нужно доделать

### 1. Логика создания элементов
В функции `addElement` добавить обработку новых типов:

```typescript
const addElement = (type: CanvasElementType) => {
  let newElement: CanvasElement
  
  switch(type) {
    case 'line':
      newElement = {
        id: generateId(),
        type: 'line',
        x: 100,
        y: 100,
        x2: 200,  // конечная точка
        y2: 100,
        width: 0,
        height: 0,
        stroke: '#000000',
        strokeWidth: 2,
      }
      break
      
    case 'arrow':
      newElement = {
        id: generateId(),
        type: 'arrow',
        x: 100,
        y: 100,
        x2: 200,
        y2: 100,
        width: 0,
        height: 0,
        stroke: '#000000',
        strokeWidth: 2,
        fill: '#000000',
        arrowDirection: 'right',
      }
      break
      
    case 'circle':
      newElement = {
        id: generateId(),
        type: 'circle',
        x: 150,
        y: 150,
        radius: 50,
        width: 100,
        height: 100,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      }
      break
      
    case 'rectangle':
      newElement = {
        id: generateId(),
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 150,
        height: 100,
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
      }
      break
      
    case 'number':
      newElement = {
        id: generateId(),
        type: 'number',
        x: 100,
        y: 100,
        width: 40,
        height: 40,
        numberValue: 1,
        fontSize: 24,
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 1,
      }
      break
  }
  
  // ... добавить в scene
}
```

### 2. Рендеринг в Konva

Добавить рендеринг для каждого типа в цикле по elements:

```typescript
// LINE
if (element.type === 'line') {
  return (
    <KonvaLine
      key={element.id}
      points={[element.x, element.y, element.x2 || element.x, element.y2 || element.y]}
      stroke={element.stroke || '#000000'}
      strokeWidth={element.strokeWidth || 2}
      draggable
      onClick={() => setSelectedId(element.id)}
    />
  )
}

// ARROW  
if (element.type === 'arrow') {
  return (
    <KonvaArrow
      key={element.id}
      points={[element.x, element.y, element.x2 || element.x, element.y2 || element.y]}
      stroke={element.stroke || '#000000'}
      fill={element.fill || '#000000'}
      strokeWidth={element.strokeWidth || 2}
      pointerLength={10}
      pointerWidth={10}
      draggable
      onClick={() => setSelectedId(element.id)}
    />
  )
}

// CIRCLE
if (element.type === 'circle') {
  return (
    <KonvaCircle
      key={element.id}
      x={element.x}
      y={element.y}
      radius={element.radius || 50}
      stroke={element.stroke || '#000000'}
      strokeWidth={element.strokeWidth || 2}
      fill={element.fill || 'transparent'}
      draggable
      onClick={() => setSelectedId(element.id)}
    />
  )
}

// RECTANGLE
if (element.type === 'rectangle') {
  return (
    <KonvaRect
      key={element.id}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      stroke={element.stroke || '#000000'}
      strokeWidth={element.strokeWidth || 2}
      fill={element.fill || 'transparent'}
      draggable
      onClick={() => setSelectedId(element.id)}
    />
  )
}

// NUMBER
if (element.type === 'number') {
  return (
    <KonvaGroup key={element.id} draggable>
      <KonvaCircle
        x={element.x}
        y={element.y}
        radius={element.width / 2}
        stroke={element.stroke || '#000000'}
        strokeWidth={element.strokeWidth || 2}
        fill="#ffffff"
      />
      <KonvaText
        x={element.x - element.width / 2}
        y={element.y - element.height / 2}
        width={element.width}
        height={element.height}
        text={String(element.numberValue || 1)}
        fontSize={element.fontSize || 24}
        fill={element.fill || '#000000'}
        align="center"
        verticalAlign="middle"
      />
    </KonvaGroup>
  )
}
```

### 3. Панель свойств

Добавить редактирование в правую панель:

```typescript
{selectedElement.type === 'line' && (
  <div className="space-y-2">
    <label>
      <span>Конечная X</span>
      <Input 
        type="number" 
        value={selectedElement.x2 || 0}
        onChange={e => updateNumeric(selectedElement.id, 'x2', Number(e.target.value))}
      />
    </label>
    <label>
      <span>Конечная Y</span>
      <Input 
        type="number" 
        value={selectedElement.y2 || 0}
        onChange={e => updateNumeric(selectedElement.id, 'y2', Number(e.target.value))}
      />
    </label>
    <label>
      <span>Толщина</span>
      <Input 
        type="number" 
        value={selectedElement.strokeWidth || 2}
        onChange={e => updateNumeric(selectedElement.id, 'strokeWidth', Number(e.target.value))}
      />
    </label>
    <label>
      <span>Цвет</span>
      <input 
        type="color" 
        value={selectedElement.stroke || '#000000'}
        onChange={e => updateElement(selectedElement.id, { stroke: e.target.value })}
      />
    </label>
  </div>
)}
```

---

## 📦 Примеры использования

### Пример 1: Соединение элементов линией
```
1. Добавить [Линия]
2. В панели свойств:
   - X: 100, Y: 100 (начало)
   - X2: 300, Y2: 200 (конец)
   - Толщина: 3
   - Цвет: синий
```

### Пример 2: Нумерация шагов
```
1. Добавить [Номер] → "1"
2. Добавить [Номер] → "2"
3. Добавить [Номер] → "3"
4. Расположить последовательно
```

### Пример 3: Выделение области
```
1. Добавить [Круг] или [Прямоугольник]
2. Настроить:
   - Цвет обводки: красный
   - Толщина: 2
   - Заливка: прозрачная
3. Разместить вокруг объекта
```

### Пример 4: Указание направления
```
1. Добавить [Стрелка]
2. Настроить направление
3. Добавить [Текст] рядом
```

---

## 🎯 Следующие шаги

### Фаза 1: Базовая реализация ✅
- [x] Исследование потребностей
- [x] Добавление типов
- [x] Добавление кнопок UI

### Фаза 2: Рендеринг (следующая)
- [ ] Реализовать addElement для новых типов
- [ ] Добавить рендеринг в Konva
- [ ] Добавить редактирование свойств
- [ ] Тестирование

### Фаза 3: Улучшения
- [ ] Snap to grid для точного позиционирования
- [ ] Автонумерация (авто-инкремент)
- [ ] Связанные стрелки (привязка к объектам)
- [ ] Пунктирные линии
- [ ] Кривые Безье

---

## 💡 Дополнительные идеи

### Шаблоны (Templates)
Готовые комбинации элементов:
- Таблица 2x3 (для дифференциации звуков)
- Последовательность 1-2-3 (для шагов)
- Стрелки направлений (↑↓←→)

### Snap Points
Магниты для точного соединения:
- Центры объектов
- Углы
- Середины сторон

### Группировка
Возможность группировать элементы:
- Выделить несколько
- [Ctrl + G] → создать группу
- Перемещать как единое целое

---

## 📚 Ресурсы

**Konva документация:**
- Line: https://konvajs.org/docs/shapes/Line.html
- Arrow: https://konvajs.org/docs/shapes/Arrow.html
- Circle: https://konvajs.org/docs/shapes/Circle.html
- Rect: https://konvajs.org/docs/shapes/Rect.html
- Text: https://konvajs.org/docs/shapes/Text.html

**Файлы проекта:**
- `worksheet-layout-types.ts` - типы
- `worksheet-layout-canvas.tsx` - рендеринг
- `worksheet-layout-editor.tsx` - обертка

---

**Статус:** Готово к реализации рендеринга! 🚀

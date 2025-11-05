# 🎨 NeiroGen Design System

Комплексная дизайн-система для платформы NeiroGen

---

## 📚 Документация

### 1. [UI/UX Guide](./UI-UX-GUIDE.md) ⭐
**Основной документ дизайн-системы**
- Философия дизайна
- Цветовая палитра
- Типографика
- Spacing & Layout
- Компоненты
- UX паттерны
- Accessibility
- Анимации
- Responsive design
- Dark mode

### 2. [Component Patterns](./COMPONENT-PATTERNS.md) 🧩
**Практические примеры кода**
- Page layout patterns
- Dashboard components
- Form patterns
- List patterns
- State management (loading, empty, error)
- Child-friendly components
- Notification patterns
- Responsive patterns

### 3. [Theme Configuration](../../frontend/THEME.md) 🎨
**Техническая конфигурация темы**
- Shadcn/ui setup
- CSS variables
- Tailwind config
- Custom animations

---

## 🚀 Быстрый старт

### Для разработчиков

1. **Прочитать UI/UX Guide** (15 минут)
   - Понять философию
   - Изучить цветовую палитру
   - Запомнить spacing scale

2. **Изучить Component Patterns** (20 минут)
   - Копировать примеры кода
   - Использовать готовые паттерны
   - Следовать best practices

3. **Применять в коде**
   ```tsx
   // ✅ DO: Use design system components
   <DashboardHeader title="..." />
   <DashboardStatCard icon={...} label="..." value={...} />
   
   // ❌ DON'T: Create custom layouts
   <div className="flex justify-between p-4 bg-white">
     {/* Custom header */}
   </div>
   ```

### Для дизайнеров

1. **Изучить UI/UX Guide** — принципы и стили
2. **Использовать цветовую палитру** — только переменные из гайда
3. **Следовать spacing scale** — 4px, 8px, 16px, 24px, 32px...
4. **Тестировать accessibility** — контрастность, размеры

---

## 🎯 Принципы

### 1. **Consistency First**
Используйте существующие компоненты вместо создания новых.

```tsx
// ✅ Good
<Button variant="outline">Action</Button>

// ❌ Bad
<button className="px-4 py-2 border rounded">Action</button>
```

### 2. **Semantic Colors**
Используйте CSS variables вместо hard-coded цветов.

```tsx
// ✅ Good
<div className="bg-background text-foreground">

// ❌ Bad
<div className="bg-white text-black dark:bg-gray-900 dark:text-white">
```

### 3. **Accessibility by Default**
Всегда добавляйте ARIA labels и keyboard support.

```tsx
// ✅ Good
<button aria-label="Close" onClick={onClose}>
  <X className="h-4 w-4" />
</button>

// ❌ Bad
<div onClick={onClose}>
  <X />
</div>
```

### 4. **Mobile First**
Начинайте с mobile layout, добавляйте desktop.

```tsx
// ✅ Good
<div className="flex flex-col md:flex-row">

// ❌ Bad
<div className="flex flex-row sm:flex-col">
```

---

## 📊 Component Library

### Layout Components

| Component | Use Case | Import |
|-----------|----------|--------|
| `DashboardHeader` | Page header | `@/components/dashboard-header` |
| `SectionCard` | Content sections | `@/components/section-card` |
| `DashboardTabsGroup` | Tab navigation | `@/components/dashboard-tabs-group` |

### Data Display

| Component | Use Case | Import |
|-----------|----------|--------|
| `DashboardStatCard` | Metrics/stats | `@/components/dashboard-stat-card` |
| `ListHeader` | List headers | `@/components/list-header` |
| `Badge` | Status labels | `@/components/ui/badge` |
| `Card` | Generic cards | `@/components/ui/card` |

### Forms

| Component | Use Case | Import |
|-----------|----------|--------|
| `Input` | Text inputs | `@/components/ui/input` |
| `Textarea` | Multi-line text | `@/components/ui/textarea` |
| `Button` | Actions | `@/components/ui/button` |
| `Label` | Form labels | `@/components/ui/label` |

### Feedback

| Component | Use Case | Import |
|-----------|----------|--------|
| `Alert` | Alerts/messages | `@/components/ui/alert` |
| `Toast` | Notifications | `@/components/ui/toast` |
| `Skeleton` | Loading states | `@/components/ui/skeleton` |
| `Progress` | Progress bars | `@/components/ui/progress` |

---

## 🎨 Color System

### Primary Palette

```css
--primary: 217 91% 60%;        /* Blue */
--secondary: 142 76% 36%;      /* Green */
--accent: 45 93% 58%;          /* Yellow */
```

### Semantic Colors

```css
--success: 142 76% 36%;        /* Green */
--warning: 45 93% 58%;         /* Yellow */
--danger: 0 84% 60%;           /* Red */
--info: 199 89% 48%;           /* Cyan */
```

### Usage

```tsx
<Badge className="bg-success text-white">Success</Badge>
<Badge className="bg-warning text-white">Warning</Badge>
<Badge className="bg-danger text-white">Error</Badge>
<Badge className="bg-info text-white">Info</Badge>
```

---

## 📏 Spacing Scale

```css
space-1  = 4px
space-2  = 8px
space-3  = 12px
space-4  = 16px
space-6  = 24px
space-8  = 32px
space-12 = 48px
space-16 = 64px
```

### Usage

```tsx
{/* Gap between elements */}
<div className="space-y-4">      {/* 16px vertical */}
<div className="flex gap-2">     {/* 8px horizontal */}
<div className="p-6">            {/* 24px padding */}
<div className="mb-8">           {/* 32px bottom margin */}
```

---

## 🧪 Testing Checklist

### Before Committing

- [ ] Component looks good in light mode
- [ ] Component looks good in dark mode
- [ ] Works on mobile (< 640px)
- [ ] Works on tablet (640px - 1024px)
- [ ] Works on desktop (> 1024px)
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Loading state implemented
- [ ] Error state implemented
- [ ] Empty state implemented (if list)

### Accessibility Check

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] ARIA labels added where needed
- [ ] Color contrast >= 4.5:1 (normal text)
- [ ] Color contrast >= 3:1 (large text)
- [ ] Images have alt text
- [ ] Forms have labels

---

## 🔄 Update Process

### When Adding New Components

1. **Check if exists** — Don't reinvent the wheel
2. **Follow patterns** — Use existing component patterns
3. **Document** — Add to COMPONENT-PATTERNS.md
4. **Test** — All states and breakpoints
5. **Review** — Code review with accessibility check

### When Modifying Existing

1. **Check usage** — Search where component is used
2. **Test all pages** — Ensure no regressions
3. **Update docs** — If behavior changes
4. **Notify team** — If breaking change

---

## 📖 Resources

### Internal
- [UI/UX Guide](./UI-UX-GUIDE.md) — Full design system
- [Component Patterns](./COMPONENT-PATTERNS.md) — Code examples
- [Theme Config](../../frontend/THEME.md) — Technical setup

### External
- [shadcn/ui](https://ui.shadcn.com/) — Component library
- [Tailwind CSS](https://tailwindcss.com/) — Utility classes
- [Radix UI](https://www.radix-ui.com/) — Primitives
- [Lucide Icons](https://lucide.dev/) — Icon set
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) — Accessibility

---

## 🎯 Roadmap

### ✅ Phase 1: Foundation (Completed)
- [x] Color system
- [x] Typography
- [x] Spacing scale
- [x] Base components (Button, Card, Input)
- [x] Dashboard components (Header, StatCard, Tabs)

### 🔄 Phase 2: Unification (In Progress)
- [x] Design system documentation
- [x] Component patterns guide
- [ ] Refactor Admin page
- [ ] Refactor Therapist page
- [ ] Refactor Child page
- [ ] Storybook setup

### 📅 Phase 3: Enhancement (Next)
- [ ] Chart components
- [ ] Timeline component
- [ ] Drag-and-drop UI
- [ ] Advanced animations (Framer Motion)
- [ ] Enhanced forms (React Hook Form)

### 🚀 Phase 4: Optimization (Future)
- [ ] Performance audit
- [ ] Bundle size optimization
- [ ] Component tree-shaking
- [ ] CSS optimization

---

## 💬 Feedback & Contributions

**Нашли ошибку?** Создайте Issue в трекере задач  
**Предложение?** Обсудите в команде  
**Вопрос?** Посмотрите примеры в COMPONENT-PATTERNS.md

---

**Maintainer:** Cascade AI  
**Last Updated:** 5 ноября 2025  
**Version:** 1.0

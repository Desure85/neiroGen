# 🎨 NeiroGen Design System & UX Guidelines

**Версия:** 1.0  
**Дата:** 5 ноября 2025  
**Статус:** Living Document

---

## 📋 Содержание

1. [Философия дизайна](#философия-дизайна)
2. [Цветовая палитра](#цветовая-палитра)
3. [Типографика](#типографика)
4. [Spacing & Layout](#spacing--layout)
5. [Компоненты](#компоненты)
6. [UX паттерны](#ux-паттерны)
7. [Accessibility](#accessibility)
8. [Анимации](#анимации)
9. [Responsive Design](#responsive-design)
10. [Dark Mode](#dark-mode)

---

## 🎯 Философия дизайна

### Принципы

1. **Clarity First** — Ясность превыше всего
   - Четкая визуальная иерархия
   - Понятные call-to-actions
   - Минималистичный UI без лишних элементов

2. **Consistency** — Консистентность во всем
   - Единые паттерны для похожих действий
   - Предсказуемое поведение компонентов
   - Согласованная терминология

3. **Context-Aware** — Адаптация под контекст
   - Для детей: яркие, крупные, игривые элементы
   - Для терапевтов: профессиональный, информативный UI
   - Для админов: плотная информация, эффективные инструменты

4. **Accessible by Default** — Доступность из коробки
   - WCAG 2.1 AA compliance
   - Keyboard navigation
   - Screen reader support

---

## 🎨 Цветовая палитра

### Primary Colors

```css
/* Основной синий (медицинский, доверие) */
--primary: 217 91% 60%;           /* #3B82F6 */
--primary-foreground: 210 40% 98%; /* #F8FAFC */

/* Вторичный зеленый (успех, рост) */
--secondary: 142 76% 36%;          /* #16A34A */
--secondary-foreground: 210 40% 98%;

/* Акцент желтый (внимание, награды) */
--accent: 45 93% 58%;              /* #FBBF24 */
--accent-foreground: 222.2 84% 4.9%;
```

### Semantic Colors

```css
/* Success */
--success: 142 76% 36%;    /* Green-600 */
--success-bg: 142 76% 96%; /* Green-50 */

/* Warning */
--warning: 45 93% 58%;     /* Amber-400 */
--warning-bg: 45 93% 95%;  /* Amber-50 */

/* Danger */
--danger: 0 84% 60%;       /* Red-500 */
--danger-bg: 0 84% 96%;    /* Red-50 */

/* Info */
--info: 199 89% 48%;       /* Cyan-600 */
--info-bg: 199 89% 96%;    /* Cyan-50 */
```

### Neutral Colors

```css
/* Gray scale */
--gray-50: 210 40% 98%;
--gray-100: 214 32% 91%;
--gray-200: 214 32% 84%;
--gray-300: 213 27% 70%;
--gray-400: 215 20% 55%;
--gray-500: 215 16% 47%;
--gray-600: 215 19% 35%;
--gray-700: 215 25% 27%;
--gray-800: 217 33% 17%;
--gray-900: 222 47% 11%;
```

### Usage Guidelines

| Context | Primary | Secondary | Accent |
|---------|---------|-----------|--------|
| **Buttons CTA** | Primary actions | Secondary actions | Special offers |
| **Badges** | Status | Success | Achievements |
| **Links** | Navigation | Breadcrumbs | External |
| **Icons** | Default | Success/Complete | Warnings |

---

## 📝 Типографика

### Font Stack

```css
font-family: 
  -apple-system, BlinkMacSystemFont, 
  "Segoe UI", Roboto, "Helvetica Neue", 
  Arial, sans-serif;
```

### Type Scale

| Element | Size | Weight | Line Height | Use Case |
|---------|------|--------|-------------|----------|
| `h1` | 2.5rem (40px) | 700 | 1.2 | Page titles |
| `h2` | 2rem (32px) | 600 | 1.3 | Section headers |
| `h3` | 1.5rem (24px) | 600 | 1.4 | Subsection headers |
| `h4` | 1.25rem (20px) | 500 | 1.4 | Card titles |
| `body` | 1rem (16px) | 400 | 1.5 | Body text |
| `small` | 0.875rem (14px) | 400 | 1.4 | Helper text |
| `tiny` | 0.75rem (12px) | 400 | 1.3 | Captions |

### Child-Friendly Typography

```css
/* Для детских компонентов */
.child-text {
  font-size: 1.5rem; /* 24px */
  font-weight: 700;
  line-height: 1.3;
  color: hsl(var(--child-primary));
}

.child-button-text {
  font-size: 1.125rem; /* 18px */
  font-weight: 700;
  letter-spacing: 0.025em;
}
```

---

## 📏 Spacing & Layout

### Spacing Scale

```css
/* Tailwind default scale */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

### Layout Grid

```css
/* Container */
.container {
  max-width: 1280px; /* 7xl */
  margin: 0 auto;
  padding: 0 1rem; /* 16px mobile */
}

@media (min-width: 640px) {
  .container { padding: 0 1.5rem; } /* 24px tablet */
}

@media (min-width: 1024px) {
  .container { padding: 0 2rem; } /* 32px desktop */
}
```

### Content Width Guidelines

| Context | Max Width | Use Case |
|---------|-----------|----------|
| **Reading content** | 65ch (prose) | Articles, descriptions |
| **Form inputs** | 100% (max 640px) | Input fields, textareas |
| **Dashboard** | 1280px (7xl) | Admin, therapist panels |
| **Modals** | 512px (2xl) | Dialogs, confirmations |

---

## 🧩 Компоненты

### 1. Buttons

#### Primary Button
```tsx
<Button variant="default" size="default">
  Primary Action
</Button>
```

**Стили:**
- Background: `hsl(var(--primary))`
- Hover: `brightness(110%)`
- Active: `brightness(90%)`
- Padding: `px-4 py-2` (16px x 8px)
- Border radius: `0.5rem` (8px)
- Font: `font-medium`

#### Sizes

```tsx
<Button size="sm">Small</Button>      // py-1 px-3
<Button size="default">Default</Button> // py-2 px-4
<Button size="lg">Large</Button>      // py-3 px-6
```

#### Variants

| Variant | Use Case | Visual |
|---------|----------|--------|
| `default` | Primary actions | Solid primary color |
| `secondary` | Less important | Solid secondary |
| `outline` | Neutral actions | Border + transparent |
| `ghost` | Tertiary actions | No border, transparent |
| `destructive` | Delete, remove | Red background |

#### Child-Friendly Button

```tsx
<button className="child-button">
  🎯 Начать упражнение!
</button>
```

**Стили:**
- Gradient: `from-blue-500 to-green-500`
- Large: `py-3 px-6`
- Rounded: `rounded-full`
- Shadow: `shadow-lg`
- Hover: `scale-105`

### 2. Cards

#### Standard Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

#### SectionCard (Preferred)

```tsx
<SectionCard
  title="Section Title"
  description="Optional description"
  actions={<Button>Action</Button>}
  contentClassName="space-y-4"
>
  {/* Content */}
</SectionCard>
```

**Benefits:**
- Consistent header layout
- Optional actions slot
- Proper spacing by default

### 3. Dashboard Components

#### DashboardHeader

```tsx
<DashboardHeader
  badge="Role Badge"
  title="Dashboard Title"
  description="Subtitle or description"
  actions={<Button>Quick Action</Button>}
/>
```

**Usage:** Единый header для всех dashboard страниц

#### DashboardStatCard

```tsx
<DashboardStatCard
  icon={<Users className="h-6 w-6" />}
  label="Metric Name"
  value={42}
  hint="Additional context"
  loading={false}
/>
```

**Visual Pattern:**
- Icon in colored circle (left)
- Label + value (right)
- Optional loading state
- Consistent spacing

#### DashboardTabsGroup

```tsx
<DashboardTabsGroup
  value={activeTab}
  onValueChange={setActiveTab}
  items={[
    { value: 'overview', label: 'Overview' },
    { value: 'details', label: 'Details' }
  ]}
  variant="secondary"
/>
```

### 4. Forms

#### Input Fields

```tsx
<div className="space-y-2">
  <label htmlFor="name" className="text-sm font-medium">
    Field Label
  </label>
  <Input
    id="name"
    placeholder="Enter value..."
    aria-describedby="name-hint"
  />
  <p id="name-hint" className="text-xs text-muted-foreground">
    Helper text
  </p>
</div>
```

**Guidelines:**
- Always use labels with `htmlFor`
- Add helper text for clarity
- Use `aria-describedby` for accessibility
- Show validation errors inline

### 5. Lists & Tables

#### List Item Pattern

```tsx
<div className="rounded-lg border border-border bg-card p-4">
  <div className="flex items-center justify-between">
    <div className="space-y-1">
      <h4 className="font-medium">Item Title</h4>
      <p className="text-sm text-muted-foreground">
        Description or metadata
      </p>
    </div>
    <div className="flex gap-2">
      <Button variant="outline" size="sm">Edit</Button>
      <Button variant="destructive" size="sm">Delete</Button>
    </div>
  </div>
</div>
```

---

## 🎭 UX Паттерны

### 1. Loading States

#### Skeleton Loading

```tsx
import { Skeleton } from "@/components/ui/skeleton"

<Card>
  <CardHeader>
    <Skeleton className="h-6 w-48" />
    <Skeleton className="h-4 w-64" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-32 w-full" />
  </CardContent>
</Card>
```

#### Spinner Loading

```tsx
<DashboardStatCard
  icon={<Users />}
  label="Active Users"
  value="..."
  loading={true}
/>
```

### 2. Empty States

```tsx
<div className="flex flex-col items-center justify-center py-12">
  <div className="mb-4 rounded-full bg-muted p-4">
    <Icon className="h-10 w-10 text-muted-foreground" />
  </div>
  <h3 className="mb-2 text-lg font-semibold">
    No Data Yet
  </h3>
  <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
    Description of why empty and what to do
  </p>
  <Button onClick={onCreate}>
    <Plus className="mr-2 h-4 w-4" />
    Create First Item
  </Button>
</div>
```

**Pattern:**
1. Icon (visual anchor)
2. Heading (what's missing)
3. Description (why + guidance)
4. CTA button (how to proceed)

### 3. Error States

```tsx
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error Loading Data</AlertTitle>
  <AlertDescription>
    {errorMessage}
    <Button variant="outline" size="sm" onClick={retry}>
      Try Again
    </Button>
  </AlertDescription>
</Alert>
```

### 4. Success Feedback

```tsx
import { useToast } from "@/components/ui/use-toast"

const { toast } = useToast()

toast({
  title: "Success!",
  description: "Item created successfully",
  duration: 3000,
})
```

### 5. Confirmation Dialogs

```tsx
// Prefer native confirm for simple cases
if (!confirm('Delete this item?')) return

// Use Dialog component for complex confirmations
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={onConfirm}>
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## ♿ Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus forward |
| `Shift+Tab` | Move focus backward |
| `Enter` | Activate button/link |
| `Space` | Toggle checkbox/radio |
| `Esc` | Close modal/dropdown |
| `Arrow keys` | Navigate lists/tabs |

### ARIA Attributes

```tsx
// Buttons
<button aria-label="Close dialog">
  <X className="h-4 w-4" />
</button>

// Form fields
<input
  aria-label="Search"
  aria-describedby="search-hint"
  aria-invalid={!!error}
/>

// Loading states
<div role="status" aria-live="polite">
  {loading ? 'Loading...' : 'Loaded'}
</div>

// Alerts
<div role="alert" className="text-red-600">
  Error message
</div>
```

### Color Contrast

**Minimum Ratios (WCAG AA):**
- Normal text: 4.5:1
- Large text (18px+): 3:1
- UI components: 3:1

**Testing:**
- Use browser DevTools contrast checker
- Test with actual color blindness simulators
- Verify in both light and dark modes

---

## 🎬 Анимации

### Transition Durations

```css
/* Quick interactions */
--duration-fast: 150ms;

/* Standard transitions */
--duration-base: 200ms;

/* Emphasized movements */
--duration-slow: 300ms;

/* Page transitions */
--duration-page: 500ms;
```

### Easing Functions

```css
/* Default */
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);

/* Smooth in-out */
transition-timing-function: cubic-bezier(0.4, 0, 0.6, 1);

/* Bounce (for children) */
transition-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Animation Guidelines

**DO:**
- Use subtle animations (scale, opacity)
- Animate feedback (hover, active states)
- Provide loading indicators
- Respect `prefers-reduced-motion`

**DON'T:**
- Animate continuously (annoying)
- Use slow animations (>500ms)
- Block interactions during animation
- Animate large elements (janky)

### Child-Friendly Animations

```css
/* Bounce */
@keyframes bounce-gentle {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}

/* Pulse */
@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Usage */
.child-element {
  animation: bounce-gentle 2s infinite;
}
```

---

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile first approach */
--breakpoint-sm: 640px;   /* Tablet */
--breakpoint-md: 768px;   /* Tablet landscape */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
--breakpoint-2xl: 1536px; /* Extra large */
```

### Responsive Patterns

#### Stack to Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

#### Hide on Mobile

```tsx
<div className="hidden md:block">
  {/* Desktop only content */}
</div>

<div className="md:hidden">
  {/* Mobile only content */}
</div>
```

#### Responsive Typography

```tsx
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  Responsive Heading
</h1>
```

---

## 🌓 Dark Mode

### Implementation

```tsx
// Use CSS variables
<div className="bg-background text-foreground">
  <Card className="border-border bg-card">
    <p className="text-muted-foreground">Text</p>
  </Card>
</div>
```

### Dark Mode Guidelines

**DO:**
- Use semantic color variables
- Test all components in dark mode
- Ensure sufficient contrast
- Adjust image brightness if needed

**DON'T:**
- Use hard-coded colors
- Invert all colors (white → black)
- Forget about shadows (barely visible)
- Use pure black (#000) backgrounds

### Dark Mode Testing Checklist

- [ ] All text readable
- [ ] Borders visible
- [ ] Focus states clear
- [ ] Images look good
- [ ] Shadows adjusted
- [ ] Forms usable
- [ ] Icons contrast
- [ ] Charts legible

---

## 📊 Implementation Checklist

### Component Audit

- [ ] All pages use `DashboardHeader`
- [ ] Stats use `DashboardStatCard`
- [ ] Sections use `SectionCard`
- [ ] Lists use consistent item pattern
- [ ] Forms have proper labels
- [ ] Buttons use variant system
- [ ] Loading states implemented
- [ ] Empty states implemented
- [ ] Error states implemented

### UX Audit

- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA labels added
- [ ] Color contrast checked
- [ ] Mobile layout tested
- [ ] Dark mode verified
- [ ] Animations smooth
- [ ] Loading feedback clear

---

## 🎯 Next Steps

### Phase 1: Унификация (текущая)
- [x] Создать дизайн-систему документ
- [ ] Рефакторить Admin page
- [ ] Рефакторить Therapist page
- [ ] Создать Storybook для компонентов

### Phase 2: Расширение
- [ ] Добавить Chart компоненты
- [ ] Создать Timeline компонент
- [ ] Улучшить форму генератора
- [ ] Добавить drag-and-drop UI

### Phase 3: Оптимизация
- [ ] Performance audit
- [ ] Accessibility audit
- [ ] Mobile UX improvements
- [ ] Анимации Framer Motion

---

**Автор:** Cascade AI  
**Дата обновления:** 5 ноября 2025  
**Версия:** 1.0

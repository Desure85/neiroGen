# 🧩 Component Patterns & Code Examples

Практические примеры использования компонентов NeiroGen

---

## 📄 Page Layout Pattern

### Standard Dashboard Page

```tsx
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardTabsGroup } from "@/components/dashboard-tabs-group"
import { DashboardStatCard } from "@/components/dashboard-stat-card"
import { SectionCard } from "@/components/section-card"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview')
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      {/* 1. Page Header */}
      <DashboardHeader
        badge="Кабинет логопеда"
        title="Панель управления"
        description="Управление детьми и упражнениями"
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Создать
          </Button>
        }
      />
      
      {/* 2. Main Content Container */}
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        
        {/* 3. Tabs Navigation */}
        <DashboardTabsGroup
          value={activeTab}
          onValueChange={setActiveTab}
          items={[
            { value: 'overview', label: 'Обзор' },
            { value: 'details', label: 'Детали' }
          ]}
        />
        
        {/* 4. Tab Content */}
        <TabsContent value="overview" className="space-y-6">
          
          {/* 4a. Stats Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DashboardStatCard
              icon={<Users className="h-6 w-6 text-blue-500" />}
              label="Всего детей"
              value={24}
            />
            {/* More stats... */}
          </div>
          
          {/* 4b. Content Sections */}
          <SectionCard
            title="Недавние сессии"
            description="История последних занятий"
            actions={<Button variant="outline">Все сессии</Button>}
          >
            {/* Section content */}
          </SectionCard>
          
        </TabsContent>
      </div>
    </div>
  )
}
```

---

## 📊 Stats Display Patterns

### Stat Card Grid

```tsx
const stats = [
  {
    icon: <Users className="h-6 w-6 text-blue-500" />,
    label: "Активные дети",
    value: 24,
    hint: "В этом месяце"
  },
  {
    icon: <TrendingUp className="h-6 w-6 text-emerald-500" />,
    label: "Средний прогресс",
    value: "78%",
    hint: "↑ 12% с прошлого месяца"
  },
  {
    icon: <Target className="h-6 w-6 text-purple-500" />,
    label: "Завершено сессий",
    value: 156,
    hint: "За последнюю неделю"
  },
  {
    icon: <Award className="h-6 w-6 text-amber-400" />,
    label: "Достижений",
    value: 42,
    hint: "Получено детьми"
  }
]

<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
  {stats.map((stat, index) => (
    <DashboardStatCard
      key={index}
      icon={stat.icon}
      label={stat.label}
      value={stat.value}
      hint={stat.hint}
    />
  ))}
</div>
```

---

## 📝 List Patterns

### Interactive List with Actions

```tsx
interface ListItem {
  id: number
  title: string
  description: string
  status: 'active' | 'inactive'
  updatedAt: string
}

function ItemList({ items }: { items: ListItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          {/* Left: Content */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground">
                {item.title}
              </h4>
              <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                {item.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {item.description}
            </p>
            <p className="text-xs text-muted-foreground">
              Обновлено: {new Date(item.updatedAt).toLocaleDateString()}
            </p>
          </div>
          
          {/* Right: Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(item.id)}>
              Изменить
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(item.id)}>
              Удалить
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### Selectable List (Children/Items)

```tsx
function SelectableList<T extends { id: number }>({ 
  items, 
  selected, 
  onSelect,
  renderItem 
}: {
  items: T[]
  selected: T | null
  onSelect: (item: T) => void
  renderItem: (item: T) => React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          className={cn(
            "rounded-lg border-2 p-4 text-left transition-all",
            "hover:shadow-lg hover:scale-105",
            selected?.id === item.id
              ? "border-primary bg-primary/5 shadow-lg"
              : "border-border bg-card"
          )}
        >
          {renderItem(item)}
        </button>
      ))}
    </div>
  )
}

// Usage
<SelectableList
  items={children}
  selected={selectedChild}
  onSelect={setSelectedChild}
  renderItem={(child) => (
    <>
      <div className="mb-2 text-3xl">{child.avatar}</div>
      <h3 className="font-semibold">{child.name}</h3>
      <p className="text-sm text-muted-foreground">
        {child.age} лет
      </p>
    </>
  )}
/>
```

---

## 📋 Form Patterns

### Standard Form Layout

```tsx
function FormExample() {
  const [formData, setFormData] = useState({
    name: '',
    age: 6,
    description: ''
  })
  
  return (
    <SectionCard
      title="Создать профиль"
      description="Заполните информацию о ребёнке"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button onClick={onSubmit}>
            Сохранить
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Field 1 */}
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Имя <span className="text-destructive">*</span>
          </label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Например: Саша"
            aria-required="true"
          />
          <p className="text-xs text-muted-foreground">
            Как зовут ребёнка
          </p>
        </div>
        
        {/* Field 2 */}
        <div className="space-y-2">
          <label htmlFor="age" className="text-sm font-medium">
            Возраст
          </label>
          <Input
            id="age"
            type="number"
            min={1}
            max={16}
            value={formData.age}
            onChange={(e) => setFormData(prev => ({ ...prev, age: Number(e.target.value) }))}
          />
        </div>
        
        {/* Field 3 */}
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Заметки (опционально)
          </label>
          <Textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Особенности, предпочтения..."
          />
        </div>
      </div>
    </SectionCard>
  )
}
```

### Inline Filters

```tsx
<Card>
  <CardContent className="p-4">
    <div className="flex flex-col gap-3 sm:flex-row">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          aria-label="Поиск"
        />
      </div>
      
      {/* Filters */}
      <select
        value={filter1}
        onChange={(e) => setFilter1(e.target.value)}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        aria-label="Фильтр 1"
      >
        <option value="all">Все</option>
        <option value="active">Активные</option>
        <option value="inactive">Неактивные</option>
      </select>
      
      <select
        value={filter2}
        onChange={(e) => setFilter2(e.target.value)}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        aria-label="Фильтр 2"
      >
        <option value="all">Все типы</option>
        <option value="type1">Тип 1</option>
        <option value="type2">Тип 2</option>
      </select>
    </div>
  </CardContent>
</Card>
```

---

## 🎯 State Patterns

### Loading State

```tsx
function DataSection() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  
  if (loading) {
    return (
      <SectionCard title="Загрузка...">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    )
  }
  
  return (
    <SectionCard title="Данные">
      {/* Actual content */}
    </SectionCard>
  )
}
```

### Empty State

```tsx
function EmptyState({ 
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">
        {title}
      </h3>
      <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
        {description}
      </p>
      <Button onClick={onAction}>
        <Plus className="mr-2 h-4 w-4" />
        {actionLabel}
      </Button>
    </div>
  )
}

// Usage
{items.length === 0 && (
  <EmptyState
    icon={Users}
    title="Нет детей"
    description="Добавьте первого ребёнка, чтобы начать работу"
    actionLabel="Добавить ребёнка"
    onAction={() => setShowAddDialog(true)}
  />
)}
```

### Error State

```tsx
function ErrorState({ 
  error, 
  onRetry 
}: { 
  error: string
  onRetry: () => void 
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Ошибка загрузки</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Повторить
        </Button>
      </AlertDescription>
    </Alert>
  )
}
```

---

## 🎨 Child-Friendly Patterns

### Child Exercise Card

```tsx
function ChildExerciseCard({ 
  exercise,
  onStart 
}: { 
  exercise: Exercise
  onStart: () => void
}) {
  return (
    <div className="child-exercise">
      {/* Icon/Image */}
      <div className="mb-4 text-center">
        <span className="text-6xl" role="img" aria-label={exercise.iconLabel}>
          {exercise.icon}
        </span>
      </div>
      
      {/* Title */}
      <h2 className="child-text mb-2 text-center">
        {exercise.title}
      </h2>
      
      {/* Description */}
      <p className="mb-6 text-center text-base text-gray-700 dark:text-gray-300">
        {exercise.description}
      </p>
      
      {/* CTA Button */}
      <button
        className="child-button w-full"
        onClick={onStart}
      >
        🚀 Начать упражнение!
      </button>
    </div>
  )
}
```

### Progress Indicator (Child)

```tsx
function ChildProgress({ 
  current, 
  total 
}: { 
  current: number
  total: number 
}) {
  const progress = (current / total) * 100
  
  return (
    <div className="rounded-xl bg-white p-4 shadow-lg dark:bg-gray-800">
      {/* Stars/Icons */}
      <div className="mb-3 flex justify-center gap-2">
        {[...Array(total)].map((_, i) => (
          <span
            key={i}
            className={cn(
              "text-3xl transition-all",
              i < current 
                ? "animate-bounce-gentle" 
                : "opacity-30"
            )}
          >
            ⭐
          </span>
        ))}
      </div>
      
      {/* Progress bar */}
      <div className="h-4 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Text */}
      <p className="mt-2 text-center text-lg font-bold text-gray-700 dark:text-gray-300">
        {current} из {total} выполнено! 🎉
      </p>
    </div>
  )
}
```

---

## 🔔 Notification Patterns

### Toast Notifications

```tsx
import { useToast } from "@/components/ui/use-toast"

function MyComponent() {
  const { toast } = useToast()
  
  const showSuccess = () => {
    toast({
      title: "✅ Успешно!",
      description: "Данные сохранены",
      duration: 3000,
    })
  }
  
  const showError = () => {
    toast({
      variant: "destructive",
      title: "❌ Ошибка",
      description: "Не удалось сохранить данные",
      duration: 5000,
    })
  }
  
  const showWarning = () => {
    toast({
      title: "⚠️ Внимание",
      description: "Некоторые поля не заполнены",
      duration: 4000,
    })
  }
  
  const showInfo = () => {
    toast({
      title: "ℹ️ Информация",
      description: "Новая версия доступна",
      duration: 6000,
    })
  }
  
  return (
    // ...
  )
}
```

---

## 📱 Responsive Patterns

### Responsive Grid

```tsx
{/* Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols, Large: 4 cols */}
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {items.map(item => (
    <Card key={item.id}>
      {/* Card content */}
    </Card>
  ))}
</div>
```

### Responsive Actions

```tsx
{/* Mobile: Stack vertically, Desktop: Row */}
<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
  <Button variant="outline">
    Отмена
  </Button>
  <Button>
    Сохранить
  </Button>
</div>
```

### Mobile Navigation

```tsx
{/* Show full nav on desktop, hamburger on mobile */}
<div className="flex items-center justify-between">
  <Logo />
  
  {/* Desktop nav */}
  <nav className="hidden md:flex md:gap-4">
    <NavLink href="/overview">Обзор</NavLink>
    <NavLink href="/children">Дети</NavLink>
    <NavLink href="/sessions">Сессии</NavLink>
  </nav>
  
  {/* Mobile menu button */}
  <Button
    variant="ghost"
    size="sm"
    className="md:hidden"
    onClick={() => setMobileMenuOpen(true)}
  >
    <Menu className="h-5 w-5" />
  </Button>
</div>
```

---

## ✅ Best Practices Checklist

### For Every Component

- [ ] Uses semantic color variables (not hard-coded)
- [ ] Responsive (mobile-first)
- [ ] Accessible (keyboard + screen reader)
- [ ] Loading state handled
- [ ] Error state handled
- [ ] Empty state handled (if list)
- [ ] Dark mode tested
- [ ] TypeScript types defined
- [ ] Consistent spacing (Tailwind scale)
- [ ] Consistent naming (kebab-case for files)

### For Every Page

- [ ] Uses `DashboardHeader`
- [ ] Uses `SectionCard` for sections
- [ ] Stats use `DashboardStatCard`
- [ ] Tabs use `DashboardTabsGroup`
- [ ] Proper meta tags (title, description)
- [ ] Loading skeleton while data loads
- [ ] Empty states for zero-data scenarios
- [ ] Error boundaries for crashes
- [ ] Mobile layout verified
- [ ] Keyboard navigation works

---

**Last Updated:** 5 ноября 2025  
**Maintainer:** Cascade AI

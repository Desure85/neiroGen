# 🚀 Frontend Setup Guide

## Быстрый старт:

```bash
# 1. Установить зависимости
make frontend-install

# 2. Запустить в режиме разработки
make frontend-dev

# 3. Собрать для продакшена
make frontend-build
```

## Docker цели

- **`prod`**: минимальный runtime-образ без dev-зависимостей.
  ```bash
  docker build --target prod -t neirogen/frontend:prod ./frontend
  ```
- **`dev`**: основан на Playwright-образе, включает браузеры и dev-зависимости. Используется `docker compose`.
  ```bash
  docker compose build frontend  # автоматически выбирает target=dev
  ```

После пересборки dev-контейнера прокачайте зависимости (они лежат в volume `frontend_node_modules`):
```bash
docker compose run --rm frontend npm ci
```

### Запуск тестов

- Линтер: `docker compose run --rm frontend npm run lint`
- Unit/RTL: `docker compose run --rm frontend npm test`
- Playwright e2e: браузеры уже доступны в dev-стейдже
  ```bash
  docker compose run --rm frontend npx playwright test
  ```

## Основные компоненты:

### ThemeProvider
Оберните ваше приложение в ThemeProvider в layout.tsx:

```tsx
import { ThemeProvider } from '@/components/theme-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### ThemeToggle
Добавьте переключатель темы:

```tsx
import { ThemeToggle } from '@/components/theme-toggle'

export default function Header() {
  return (
    <header>
      <ThemeToggle />
    </header>
  )
}
```

## Стили:

### Детские компоненты:
```tsx
// Упражнение
<div className="child-exercise">
  <h2 className="child-text">Название упражнения</h2>
  <button className="child-button">
    Начать!
  </button>
</div>
```

### Медицинские компоненты:
```tsx
// Карточка прогресса
<div className="medical-card">
  <button className="medical-button-primary">
    Сохранить
  </button>
</div>
```

## Анимации:
```tsx
// Мягкое подпрыгивание
<div className="animate-bounce-gentle">🎈</div>

// Пульсация
<div className="animate-pulse-soft">💖</div>
```

## Цвета:
- Синий: Основной цвет (медицинский)
- Зеленый: Успех, завершение
- Желтый: Предупреждения
- Красный: Ошибки
## Доступность:
- Все компоненты keyboard-navigable
- Screen reader friendly
- High contrast ratios
- Focus indicators

## ComfyUI (встройка)

В админке доступна встройка интерфейса ComfyUI через компонент `src/components/comfy-embed.tsx`.

- Источник берётся из переменной `NEXT_PUBLIC_COMFY_URL` (по умолчанию `http://<host>:8188`).
- В `docker-compose.yml` для dev фронтенда уже проброшено: `NEXT_PUBLIC_COMFY_URL=http://localhost:8189` (порт 8189 -> контейнер 8188).
- Сервис моков `comfyui-mock` поднимается на 8189 (наружу) и имеет эндпоинты `GET /` и `POST /prompt`.
- Для отображения статуса компонент обращается к бэкенду `GET /api/integration/comfy/health`.

Быстрый тест:


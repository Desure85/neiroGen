# NeiroGen 🧠

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Платформа для генерации нейрологопедических и логопедических упражнений

## 📋 О проекте

NeiroGen — это современная веб-платформа для создания, управления и проведения логопедических и нейропсихологических упражнений для детей. Система поддерживает генерацию интерактивных заданий и печатных листов формата A4.

### Основные возможности

- 🎯 **Генерация упражнений** — автоматическое создание заданий разных типов
- 📝 **Управление типами упражнений** — гибкая система типов с динамическими полями
- 👥 **Мультитенантность** — поддержка нескольких организаций
- 👨‍⚕️ **Кабинеты** — для логопедов, администраторов и детей
- 📊 **Отслеживание прогресса** — статистика выполнения упражнений
- 🖨️ **Печатные листы** — генерация PDF для работы оффлайн
- 🎨 **Интерактивные редакторы** — Canvas/SVG для создания заданий

## 🚀 Быстрый старт

### Требования

- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Make** (опционально, но рекомендуется)
- **Git**

### Установка

```bash
# 1. Клонировать репозиторий
git clone <repository-url>
cd neiroGen

# 2. Запустить все сервисы
make up

# 3. Выполнить миграции и seeding
make migrate
make seed

# 4. Проект готов!
# Backend API: http://localhost:8080
# Frontend: http://localhost:3000
```

### Альтернативный запуск (без Make)

```bash
docker compose --profile dev up -d
docker compose exec app php artisan migrate --seed
```

## 🏗️ Технологический стек

### Backend
- **PHP** 8.3+
- **Laravel** 10.x
- **RoadRunner** 2.x (вместо PHP-FPM)
- **PostgreSQL** 15
- **Redis** 7 (кэширование, сессии)
- **RabbitMQ** 3.13 (очереди задач)
- **MinIO** (S3-совместимое хранилище)

### Frontend
- **Next.js** 14.0 (React 18)
- **TypeScript**
- **Tailwind CSS** 3.3
- **shadcn/ui** (компоненты на базе Radix UI)
- **React Konva** (Canvas редактор)
- **Tiptap** (Rich text editor)

### Дополнительные сервисы
- **ComfyUI** (генерация изображений через Stable Diffusion)
- **SVG Generator** (Go-сервис для SVG генерации)

## 📂 Структура проекта

```
neiroGen/
├── app/                    # Laravel приложение
│   ├── app/               # PHP код (Models, Controllers, Services)
│   ├── routes/            # API маршруты
│   ├── database/          # Миграции и seeders
│   └── tests/             # PHPUnit/Pest тесты
├── frontend/              # Next.js приложение
│   ├── app/              # App Router (страницы)
│   ├── components/       # React компоненты
│   ├── lib/              # Утилиты
│   └── tests/            # Jest + Playwright тесты
├── docs/                  # Документация
├── svggen/               # Go сервис (SVG генератор)
├── docker-compose.yml    # Docker конфигурация
└── Makefile              # Команды для разработки
```

## 🛠️ Основные команды

### Docker управление
```bash
make up              # Запустить все контейнеры
make down            # Остановить контейнеры
make build           # Пересобрать образы
make rebuild         # Полная пересборка
make logs            # Показать логи всех сервисов
```

### Backend (Laravel)
```bash
make shell           # Войти в app контейнер
make composer        # Установить зависимости
make artisan CMD="..." # Выполнить artisan команду
make migrate         # Запустить миграции
make seed            # Заполнить БД тестовыми данными
make test            # Запустить PHPUnit тесты
make db-fresh        # Пересоздать БД (migrate:fresh + seed)
```

### Frontend (Next.js)
```bash
make frontend-shell  # Войти в frontend контейнер
make frontend-build  # Собрать production build
make frontend-test   # Запустить тесты
```

### Тестирование
```bash
make test            # Backend тесты (PHPUnit/Pest)
make frontend-test   # Frontend тесты (Jest)
```

## 📚 Документация

- [API Документация](docs/api.md) *(в разработке)*
- [Архитектура](docs/architecture.md) *(в разработке)*
- [Генераторы упражнений](docs/generators/)
- [Frontend компоненты](frontend/README.md)
- [Темизация](frontend/THEME.md)

### Аудиты проекта
- [Аудит от 27 октября 2025](docs/AUDIT-2025-10-27.md)
- [Аудит от 5 ноября 2025](docs/AUDIT-2025-11-05.md) ⚠️ **Критические рекомендации**

## 🧪 Тестирование

### Backend тесты
```bash
cd app
./vendor/bin/phpunit
# или с Pest
./vendor/bin/pest
```

### Frontend тесты
```bash
cd frontend
npm test
# E2E тесты
npm run test:e2e
```

## 🔐 Безопасность

- **Аутентификация**: Laravel Sanctum (token-based)
- **Авторизация**: Role-based (admin, therapist, child)
- **CORS**: настроен для frontend домена
- **Rate Limiting**: защита от brute-force на auth endpoints

## 🤝 Contributing

*(В разработке)*

1. Fork проекта
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

## 📝 License

Этот проект распространяется под лицензией MIT. См. файл `LICENSE` для деталей.

## 🆘 Проблемы и поддержка

При возникновении проблем:
1. Проверьте [FAQ](docs/faq.md) *(в разработке)*
2. Ищите похожие [Issues](../../issues)
3. Создайте новый Issue с подробным описанием

## 🚧 Статус проекта

**Текущая версия**: MVP (в активной разработке)

**Последний аудит**: 5 ноября 2025  
**Оценка**: 6.5/10 ⚠️

### Критические задачи (до 12 ноября 2025)
- [ ] Настроить CI/CD (GitHub Actions)
- [ ] Установить PHPStan level 5+
- [ ] Увеличить test coverage (≥50% backend, ≥30% frontend)
- [ ] Завершить 1 задачу из текущих in_progress

См. [детальный аудит](docs/AUDIT-2025-11-05.md) для полного списка рекомендаций.

---

**Автор проекта**: [Your Name/Organization]  
**Контакт**: [contact@example.com]

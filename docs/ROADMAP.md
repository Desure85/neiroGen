# 🗺️ Roadmap NeiroGen (Q4 2025 - Q1 2026)

**Последнее обновление:** 5 ноября 2025  
**Статус проекта:** MVP в разработке

---

## 🔴 Критические задачи (Блокеры) — до 12 ноября 2025

### 1. Инфраструктура качества
- [ ] **CI/CD Pipeline** — GitHub Actions (2 дня)
  - Backend: Pint + PHPUnit
  - Frontend: ESLint + Jest
  - Статус badges в README
  
- [ ] **PHPStan Level 5** — Статический анализ PHP (1 день)
  - Установка + конфигурация
  - Baseline или fix критических ошибок
  - Интеграция в CI

- [ ] **README.md** — Документация проекта (2 часа)
  - ✅ Создан 5 ноября
  - [ ] Добавить CI badges
  - [ ] Проверить инструкции

### 2. Разблокировать застрявшие задачи
- [ ] **Ретроспектива** — понять причины стагнации (0.5 дня)
- [ ] **WIP Limit = 2** — установить и соблюдать
- [ ] **Завершить 1 задачу** из текущих 7 in_progress:
  - Приоритет: **Админский CRUD типов упражнений** (backend готов ✅)
  - Альтернатива: **Унификация UI компонентов**

---

## ⚠️ Высокий приоритет — до 19 ноября 2025

### 3. Увеличение test coverage
- [ ] Backend: ≥60% line coverage
  - Установить pcov для coverage
  - Feature test для каждого API endpoint
  - Coverage report в CI
  
- [ ] Frontend: ≥30% line coverage
  - Восстановить удаленные тесты (было 10, стало 2)
  - Unit тесты для критичных компонентов
  - Coverage badge в README

### 4. OpenAPI/Swagger документация
- [ ] Установить darkaonline/l5-swagger
- [ ] Аннотации в контроллерах (начать с Auth)
- [ ] Swagger UI на /api/documentation
- [ ] Schemas для моделей

### 5. Security Audit (базовый)
- [ ] composer audit + npm audit
- [ ] Исправить critical/high уязвимости
- [ ] Rate limiting на все API endpoints
- [ ] Security headers middleware
- [ ] CSRF/CORS проверка
- [ ] SECURITY.md документ

---

## 📊 Средний приоритет — до 3 декабря 2025

### 6. Рефакторинг трекера задач
- [ ] Архивировать completed задачи
- [ ] Удалить obsolete pending
- [ ] Сгруппировать по эпикам
- [ ] Roadmap Q1 2026
- [ ] Active tasks ≤30

### 7. Базовый мониторинг
- [ ] Laravel Telescope (dev)
- [ ] Structured logging (JSON)
- [ ] Расширенный /api/health endpoint
- [ ] Метрики: DB, Redis, RabbitMQ, MinIO

### 8. Завершить in_progress задачи
- [ ] Унификация UI кабинетов
- [ ] Страница пациента (рефакторинг на печать)
- [ ] Exercise constructor (Canvas/SVG editor)
- [ ] Графический диктант (Go backend)

---

## 🔮 Долгосрочные приоритеты — Q1 2026

### 9. Production-ready
- [ ] ERD диаграмма БД
- [ ] Architecture Decision Records (ADR)
- [ ] C4 model диаграммы
- [ ] Deployment guide
- [ ] Contribution guidelines
- [ ] Performance optimization (N+1 queries, indexes)

### 10. Observability Platform
- [ ] ELK/Loki для логов
- [ ] Prometheus + Grafana
- [ ] Jaeger для distributed tracing
- [ ] Alerts & on-call

### 11. Microservices extraction
- [ ] ✅ Графический диктант → Go сервис (in progress)
- [ ] ComfyUI integration → отдельный сервис
- [ ] Event-driven architecture (RabbitMQ events)

### 12. Mobile App (React Native)
- [ ] Shared codebase с web
- [ ] Offline-first для детей
- [ ] Push notifications

---

## 📈 Метрики успеха

### Week 1 (до 12 ноября)
- ✅ README.md создан
- ⏳ CI/CD работает
- ⏳ PHPStan установлен
- ⏳ 1 задача завершена
- ⏳ WIP limit = 2

### Week 2 (до 19 ноября)
- ⏳ OpenAPI docs
- ⏳ Coverage ≥50% backend, ≥20% frontend
- ⏳ Security audit базовый

### Month 1 (до 5 декабря)
- ⏳ Coverage ≥60% backend, ≥30% frontend
- ⏳ Трекер очищен (≤30 active)
- ⏳ Базовый мониторинг

---

## 🎯 Определение завершенности (Definition of Done)

Для каждой задачи обязательно:
- [ ] Код написан и проверен
- [ ] Тесты добавлены (минимум 1)
- [ ] CI проходит
- [ ] Документация обновлена (если нужно)
- [ ] Code review выполнен
- [ ] Задача закрыта в трекере

---

## 📋 Эпики и группировка

### Epic 1: Infrastructure & Quality (Q4 2025)
- CI/CD, PHPStan, Coverage, Security

### Epic 2: Core Features (Q4 2025)
- Admin CRUD, UI унификация, Patient page

### Epic 3: Documentation (Q4 2025)
- README, OpenAPI, ERD, ADR

### Epic 4: Observability (Q1 2026)
- Monitoring, Logging, Tracing

### Epic 5: Scale & Mobile (Q1 2026)
- Microservices, Performance, React Native

---

## ⚡ Следующие шаги (сегодня!)

1. ☐ Прочитать аудит: `docs/AUDIT-2025-11-05.md`
2. ☐ Провести ретроспективу (понять блокеры)
3. ☐ Установить WIP limit = 2
4. ☐ Начать работу над CI/CD pipeline
5. ☐ Установить PHPStan

---

**Ответственный за roadmap:** Команда проекта  
**Следующий пересмотр:** 19 ноября 2025

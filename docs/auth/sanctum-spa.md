# Sanctum SPA аутентификация

## Назначение
Cookie-базовая авторизация для одностраничного клиента (Next.js) c использованием Laravel Sanctum. Реализация активна начиная с коммита, в котором были обновлены `app/Http/Controllers/Api/AuthController.php`, `app/Http/Kernel.php` и фронтенд-клиент `frontend/src/lib/api.ts`.

## Переменные окружения
- `SANCTUM_STATEFUL_DOMAINS` — домены SPA (dev: `localhost:3000,localhost:3001,127.0.0.1:3000`).
- `SESSION_DOMAIN` — домен для cookie; в dev может быть пустым.
- `SESSION_SECURE_COOKIE` — `false` для http dev, `true` для prod/https.
- `SESSION_SAME_SITE` — `lax` (dev) или `none` (prod c HTTPS).
- `CORS_ALLOWED_ORIGINS` — список разрешённых origin (через запятую), например `http://localhost:3000`.

Параметры описаны в `.env.example` и читаются конфигами `config/session.php`, `config/cors.php`, `config/sanctum.php`.

## Backend поток
1. Клиент запрашивает `GET /sanctum/csrf-cookie` → приложение возвращает httpOnly `laravel_session` и JS-доступный `XSRF-TOKEN`.
2. При POST/PUT/PATCH/DELETE клиент добавляет заголовок `X-XSRF-TOKEN` (прокси в `frontend/src/lib/api.ts`).
3. `AuthController::login()` использует `Auth::attempt()`, регенерирует сессию и CSRF-токен, возвращает JSON.
4. Все защищённые маршруты используют `auth:sanctum`.
5. `AuthController::logout()` инвалидирует сессию и регенерирует токен, очищая cookie.

## Frontend поток
Файл `frontend/src/lib/api.ts`:
- `apiFetch()` вызывает `fetch` с `credentials: 'include'`.
- Перед изменяющими запросами гарантирует наличие `XSRF-TOKEN` (функция `ensureCsrfCookie`).
- Обрабатывает 401/419 и выдаёт ошибки UX.

Страницы:
- `login/page.tsx` → перед POST вызывает `ensureCsrfCookie()`, после успешного ответа редиректит на `/therapist`.
- `components/header.tsx` → logout вызывает `ensureCsrfCookie()` и POST `/api/auth/logout`, затем редирект на `/login`.

## Тестирование
Feature-тест `tests/Feature/AuthTest.php` покрывает:
- Регистрацию: проверяет выдачу cookie и аутентификацию.
- SPA поток: получение CSRF cookie → login → `GET /api/auth/me` → logout → проверка гостевого состояния.

## Ручная проверка (curl)
```
curl -i -c cookies.txt http://localhost:8000/sanctum/csrf-cookie
curl -i -b cookies.txt -c cookies.txt -H "X-XSRF-TOKEN: $(grep XSRF-TOKEN cookies.txt | awk '{print $7}')" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:8000/api/auth/login \
  -d '{"email":"admin@example.com","password":"secret1234"}'
curl -i -b cookies.txt http://localhost:8000/api/auth/me
curl -i -b cookies.txt -c cookies.txt -H "X-XSRF-TOKEN: $(grep XSRF-TOKEN cookies.txt | awk '{print $7}')" \
  -X POST http://localhost:8000/api/auth/logout
```

## Известные ограничения
- Для prod окружений обязательно выдать HTTPS и настроить `SESSION_SECURE_COOKIE=true`, `SESSION_SAME_SITE=none`.
- Ошибка `Cannot find type definition file for 'jest'` остаётся в фронтенд-типах; решить отдельной задачей (добавить `@types/jest` или удалить из `tsconfig.json`).

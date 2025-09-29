# Очереди (RabbitMQ) и интеграция ComfyUI

## Обзор
- **Backend**: Laravel (RoadRunner/Octane) с очередями через RabbitMQ (`QUEUE_CONNECTION=rabbitmq`).
- **Mock ComfyUI**: сервис `comfyui-mock` (Flask), по умолчанию включается в профиле `dev` и слушает `8188` внутри контейнера (наружу: `8189`).
- **Frontend**: Next.js. Встройка ComfyUI в админке через `src/components/comfy-embed.tsx`.

## Переменные окружения

### Backend (`app/.env.example`)
```
# Очереди (RabbitMQ)
QUEUE_CONNECTION=rabbitmq
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/
RABBITMQ_QUEUE=default

# Интеграции
COMFYUI_URL=http://comfyui-mock:8188
COMFYUI_TIMEOUT=120
SVGGEN_URL=http://svggen:4000
SVGGEN_TIMEOUT=150

# SPA (Sanctum)
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:3001,127.0.0.1,127.0.0.1:3001
```

### Frontend (`frontend/.env.example`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_COMFY_URL=http://localhost:8189
NEXT_TELEMETRY_DISABLED=1
```

## Docker Compose профили
- Профиль `dev` включает `frontend` и `comfyui-mock`.
- Запуск профиля `dev`:
```
docker compose --profile dev up -d --build
```
- Запуск без профиля (prod‑приближенно, без mock и dev‑фронта):
```
docker compose up -d --build
```

## Health‑эндпоинты
- Backend: `GET /api/health` — проверяет DB и Redis, возвращает latencies. Используется healthcheck'ом сервиса `app`.
- ComfyUI mock: `GET /` — простая проверка сервиса в контейнере `comfyui-mock`.
- Svggen: `GET /health` — проверяет готовность сервиса `svggen`.

## Очереди и воркер
- Воркер запускается в сервисе `queue-worker` командой:
```
php artisan queue:work rabbitmq --sleep=1 --tries=3 --no-interaction
```
- Обмены/очереди RabbitMQ создаются автоматически драйвером (дефолтная очередь `default`).

## ComfyUI в админке
- Компонент: `frontend/src/components/comfy-embed.tsx`.
- Источник iframe берется из `NEXT_PUBLIC_COMFY_URL` (по умолчанию `http://<host>:8188`; в dev через compose — `http://localhost:8189`).
- Компонент показывает статус из бэкенда `GET /api/integration/comfy/health`.

## Быстрый старт (dev)
```
make up-dev           # поднимает все, включая frontend и comfyui-mock
make ps               # статус контейнеров
open http://localhost:3001/admin
```

## Примечания
- Перекладывание на реальный ComfyUI: установите `COMFYUI_URL` на фактический адрес сервиса, а во фронтенде измените `NEXT_PUBLIC_COMFY_URL`.
- Для прод окружений ограничьте CORS и заголовки безопасности согласно требованиям (см. глобальный middleware SecurityHeadersMiddleware).

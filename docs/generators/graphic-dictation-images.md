# Где находятся сгенерированные изображения?

## Обзор

Все изображения графического диктанта сохраняются в **MinIO** - объектное хранилище, аналог AWS S3.

## Доступ к MinIO Console

### URL
```
http://localhost:9001
```

### Учётные данные
- **Логин:** `minioadmin`
- **Пароль:** `minioadmin`

## Расположение файлов

### Bucket
`generator`

### Путь
```
generator/
  └── graphic-dictation/
      ├── source/          # Загруженные исходные изображения (legacy mode)
      └── results/         # Результаты генерации ← ВОТ ЗДЕСЬ!
          ├── {job_id}-{timestamp}.png
          └── {job_id}-{timestamp}.svg
```

## Типы файлов

### PNG файлы
- Растровое изображение превью
- Показывает фигуру на сетке
- Используется для предпросмотра в UI

### SVG файлы
- Векторное изображение
- Масштабируется без потери качества
- Можно редактировать в графических редакторах

## Пример файлов

```
5361bee7-872e-4b4a-a5cf-8a7222e10bfa-1759210625659115692.png  (1.2 KB)
5361bee7-872e-4b4a-a5cf-8a7222e10bfa-1759210625659115692.svg  (368 B)
```

## Как посмотреть файлы

### Через MinIO Console (UI)

1. Откройте http://localhost:9001
2. Войдите (`minioadmin` / `minioadmin`)
3. Выберите bucket **generator**
4. Перейдите в папку **graphic-dictation**
5. Откройте папку **results**
6. Увидите список всех PNG и SVG файлов

### Через командную строку

```bash
# Список файлов
docker exec neirogen_minio sh -c \
  "mc ls local/generator/graphic-dictation/results/"

# Скачать файл
docker exec neirogen_minio sh -c \
  "mc cp local/generator/graphic-dictation/results/FILE.png /tmp/"
```

### Через API

Файлы доступны по HTTP:

```
http://localhost:9000/generator/graphic-dictation/results/{filename}
```

**Пример:**
```
http://localhost:9000/generator/graphic-dictation/results/5361bee7-872e-4b4a-a5cf-8a7222e10bfa-1759210625659115692.png
```

## URL в ответах API

При генерации графического диктанта в ответе возвращаются поля:

```json
{
  "preview_image_url": "http://localhost:9000/generator/graphic-dictation/results/...-....png",
  "preview_svg_url": "http://localhost:9000/generator/graphic-dictation/results/...-....svg"
}
```

Эти URL можно использовать для:
- Отображения в браузере
- Скачивания файлов
- Встраивания в документы

## Время хранения

По умолчанию файлы хранятся **бессрочно**. 

Чтобы настроить автоудаление старых файлов (lifecycle policy):

```bash
docker exec neirogen_minio sh -c "mc ilm rule add local/generator \
  --prefix 'graphic-dictation/results/' \
  --expiry-days 30"
```

Это удалит файлы старше 30 дней.

## Troubleshooting

### Не вижу файлы в MinIO

**Проблема:** Bucket `generator` пустой

**Решение:**
1. Проверьте что задание завершилось успешно (статус `completed`)
2. Обновите страницу в MinIO Console (F5)
3. Проверьте логи Go-воркера:
   ```bash
   docker logs neirogen_go_gd_worker --tail 50
   ```

### Ошибка доступа к файлам

**Проблема:** 403 Forbidden или 404 Not Found

**Возможные причины:**
1. Bucket `generator` не существует
2. Неправильные креды MinIO
3. Файл действительно не был создан

**Проверка:**
```bash
# Проверить существование bucket
docker exec neirogen_minio sh -c "mc ls local/"

# Создать bucket если нужно
docker exec neirogen_minio sh -c "mc mb local/generator"

# Проверить права доступа
docker exec neirogen_minio sh -c "mc anonymous get local/generator"
```

### Медленная загрузка изображений

**Проблема:** Файлы долго загружаются

**Решение:**
- MinIO работает через Docker, может быть медленнее чем нативный
- Для продакшена используйте внешний MinIO или S3
- Настройте CDN перед MinIO

## Продакшен настройки

### Использование внешнего S3/MinIO

В `.env`:
```bash
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=your-bucket
MINIO_USE_SSL=true
MINIO_PUBLIC_ENDPOINT=https://your-bucket.s3.amazonaws.com
```

### CDN перед MinIO

Используйте CloudFlare, AWS CloudFront или Nginx для кэширования:

```nginx
location /generator/ {
    proxy_pass http://minio:9000;
    proxy_cache minio_cache;
    proxy_cache_valid 200 1h;
}
```

## Мониторинг

### Размер bucket

```bash
docker exec neirogen_minio sh -c \
  "mc du local/generator/graphic-dictation/results/"
```

### Количество файлов

```bash
docker exec neirogen_minio sh -c \
  "mc ls local/generator/graphic-dictation/results/ | wc -l"
```

### Последние файлы

```bash
docker exec neirogen_minio sh -c \
  "mc ls local/generator/graphic-dictation/results/ --recursive | tail -10"
```

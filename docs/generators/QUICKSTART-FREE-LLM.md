# Быстрый старт с бесплатным LLM (2 минуты)

## Groq - рекомендуется! ⚡

### 1. Получить API ключ (1 минута)
Откройте https://console.groq.com/keys → **Create API Key**

### 2. Добавить в `.env` (30 секунд)
```bash
echo "LLM_PROVIDER=groq" >> .env
echo "GROQ_API_KEY=gsk_ваш_ключ" >> .env
```

### 3. Перезапустить воркер (30 секунд)
```bash
docker-compose restart go-graphic-dictation-worker
```

### 4. Готово! Тестируйте 🎉

Откройте генератор → Режим "По описанию" → Введите:
- `подъёмный кран`
- `экскаватор`
- `замок`
- `слон`
- Любую фигуру!

---

## Альтернатива: Google Gemini

```bash
# Получить ключ: https://makersuite.google.com/app/apikey
echo "LLM_PROVIDER=gemini" >> .env
echo "GEMINI_API_KEY=AIza_ваш_ключ" >> .env
docker-compose restart go-graphic-dictation-worker
```

---

## Что работает без настройки?

**13 готовых шаблонов:**
- домик, дерево, машинка, лодка, робот
- самолёт, ракета, бабочка, бетономешалка
- собачка, кошка, квадрат, прямоугольник

**LLM нужен только для произвольных фигур!**

---

## Проблема?

```bash
# Проверить логи
docker logs neirogen_go_gd_worker --tail 30

# Проверить переменные
docker exec neirogen_go_gd_worker env | grep GROQ
```

**Всё!** Теперь можно генерировать любые фигуры бесплатно 🚀

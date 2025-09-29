# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - link "NeiroGen" [ref=e6] [cursor=pointer]:
        - /url: /therapist
      - navigation [ref=e7]:
        - link "Кабинет" [ref=e8] [cursor=pointer]:
          - /url: /therapist
        - link "Админка" [ref=e9] [cursor=pointer]:
          - /url: /admin
    - generic [ref=e10]:
      - button "Toggle language" [ref=e11] [cursor=pointer]:
        - generic [ref=e12] [cursor=pointer]: Toggle language
        - img [ref=e13] [cursor=pointer]
        - generic [ref=e17] [cursor=pointer]: RU
      - button "Toggle theme" [ref=e18] [cursor=pointer]:
        - img [ref=e19] [cursor=pointer]
        - img
        - generic [ref=e25] [cursor=pointer]: Toggle theme
      - button "Войти" [ref=e26] [cursor=pointer]
  - generic [ref=e28]:
    - generic [ref=e29]:
      - heading "Вход" [level=3] [ref=e30]
      - paragraph [ref=e31]: Войдите в систему, чтобы продолжить
    - generic [ref=e33]:
      - generic [ref=e34]:
        - generic [ref=e35]: Email
        - textbox "you@example.com" [ref=e36]: admin@demo.local
      - generic [ref=e37]:
        - generic [ref=e38]: Пароль
        - textbox "••••••••" [ref=e39]: password
      - generic [ref=e40]: Failed to fetch
      - button "Войти" [ref=e41] [cursor=pointer]
  - alert [ref=e42]
```
# Культурный код Беларуси

Образовательная платформа для школьников на тему «Моя родина — Республика Беларусь». Читай статьи, проходи викторины, зарабатывай баллы и открывай достижения.

## Стек технологий

- **Frontend:** React + Vite + CSS
- **Backend:** Go + JWT + SQLite (pure Go драйвер `modernc.org/sqlite`)
- **База данных:** SQLite

## Запуск проекта

### 1. Бэкенд

```bash
cd backend
go mod tidy
go build -o cultcode-backend .
./cultcode-backend
```

Бэкенд запустится на `http://127.0.0.1:8081`.

### 2. Фронтенд

В новом терминале:

```bash
npm install
npm run dev
```

Открой в браузере `http://localhost:5173`.

## Данные администратора

При первом запуске бэкенда автоматически создаётся администратор:

- **Логин:** `admin`
- **Пароль:** `admin123`

Админка доступна после входа под этим аккаунтом во вкладке «Админка».

## Возможности админки

- Добавление новых статей
- Редактирование существующих статей
- Удаление статей
- Просмотр списка пользователей
- Удаление пользователей (кроме администратора)

## API endpoints

### Публичные
- `POST /api/register` — регистрация
- `POST /api/login` — вход
- `GET /api/articles` — список статей
- `GET /api/articles/:id` — одна статья

### Требуют авторизации
- `GET /api/me` — текущий пользователь
- `POST /api/results` — сохранить результат
- `GET /api/results/my` — мои результаты
- `GET /api/progress` — прогресс
- `GET /api/chat/conversations` — список диалогов
- `GET /api/chat/messages?peer=username` — сообщения с пользователем
- `POST /api/chat/messages` — отправить сообщение
- `GET /api/chat/unread` — количество непрочитанных сообщений

### Требуют роли admin
- `POST /api/admin/articles` — создать статью
- `PUT /api/admin/articles/:id` — обновить статью
- `DELETE /api/admin/articles/:id` — удалить статью
- `GET /api/admin/users` — список пользователей
- `DELETE /api/admin/users/:id` — удалить пользователя

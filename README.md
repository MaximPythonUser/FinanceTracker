# Finance Tracker

Небольшой трекер личных финансов на FastAPI, SQLAlchemy и vanilla JavaScript. Приложение поддерживает SQLite для локального запуска и PostgreSQL для запуска через Docker.

Приложение позволяет:

- создавать кошельки в RUB, USD и EUR;
- добавлять доходы и расходы;
- переводить деньги между кошельками;
- смотреть общий баланс и историю операций;
- регистрироваться через email-код;
- входить после регистрации по email и паролю;
- восстанавливать пароль через email-код.

## Стек

- Python 3.10+
- FastAPI
- SQLAlchemy 2
- SQLite или PostgreSQL
- Alembic для миграций схемы базы данных
- Pydantic 2
- JWT с алгоритмом HS256
- Argon2 для хеширования паролей
- Python logging для структурированного логирования
- HTML, CSS и vanilla JavaScript

## Быстрый запуск

1. Создайте виртуальное окружение:

```powershell
py -m venv .venv
```

2. Активируйте его:

```powershell
.\.venv\Scripts\Activate.ps1
```

3. Установите зависимости:

```powershell
python -m pip install -r requirements.txt
```

4. Создайте файл `.env` на основе `.env.example` и укажите значения. Для работы с PostgreSQL задайте `POSTGRES_PASSWORD` и такой же пароль в `DATABASE_URL`. Не используйте реальные секреты из примера:

```env
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SECRET_KEY=long-random-secret
POSTGRES_DB=finance_tracker
POSTGRES_PASSWORD=local-development-password
DATABASE_URL=postgresql+psycopg://finance_user:local-development-password@localhost:5433/finance_tracker
```

Для Gmail используйте App Password, а не обычный пароль от аккаунта.

5. Запустите PostgreSQL через Docker Compose:

```powershell
docker compose up -d
```

Контейнер публикует PostgreSQL на порту `5433` хоста (внутри контейнера используется `5432`). Данные базы хранятся в локальной папке `postgres_data/`, которая исключена из Git.

6. Примените миграции, чтобы создать таблицы:

```powershell
python -m alembic upgrade head
```

Миграции создают схему, но не переносят данные из SQLite.

7. Запустите сервер:

```powershell
python -m uvicorn main:app --reload
```

После запуска:

- приложение: http://127.0.0.1:8000/
- Swagger UI: http://127.0.0.1:8000/docs

В Windows также можно запустить `start_server.bat`.

Если `DATABASE_URL` не задан, приложение использует `finance_tracker.db` в SQLite. При запуске на SQLite также сначала примените миграции командой `python -m alembic upgrade head`.

### Перенос существующей SQLite-базы

Чтобы перенести пользователей, кошельки и операции из `finance_tracker.db` в пустую PostgreSQL-базу:

1. Сделайте резервную копию SQLite-файла.
2. Запустите PostgreSQL и примените миграции.
3. Выполните из корня проекта:

   ```powershell
   python .\migrate.py
   ```

Скрипт сохраняет ID записей и переносит данные одной транзакцией. Он остановится, если целевые таблицы уже содержат записи. Временные email-коды не переносятся. Скрипт не удаляет и не изменяет SQLite-файл.

## Авторизация

### Регистрация

1. На frontend выберите «Регистрация».
2. Укажите login и email.
3. Запросите код.
4. Введите код из письма и придумайте пароль.
5. Backend проверит код, сохранит Argon2-хеш пароля и вернёт JWT.

Email-код нужен только для подтверждения регистрации.

### Обычный вход

После регистрации выберите «Вход» и укажите email и пароль. Endpoint `/auth/login` вернёт JWT.

Frontend хранит JWT в `localStorage` и отправляет его в защищённые запросы:

```text
Authorization: Bearer <token>
```

### Восстановление пароля

1. На форме входа нажмите «Забыли пароль?».
2. Укажите email, привязанный к аккаунту.
3. Получите 6-значный код на email.
4. Введите код и новый пароль.
5. Пароль будет перезаписан, JWT станет невалидным — войдите заново.

## Основные API-маршруты

Все маршруты имеют префикс `/api/v1`.

| Метод | Маршрут                | Назначение                                    |
| ----- | ---------------------- | --------------------------------------------- |
| POST  | `/users`               | Создать пользователя для регистрации          |
| POST  | `/auth/request-code`   | Отправить email-код                           |
| POST  | `/auth/verify-code`    | Подтвердить код, задать пароль и получить JWT |
| POST  | `/auth/login`          | Войти по email и паролю                       |
| POST  | `/auth/request-password-reset` | Запросить код сброса пароля            |
| POST  | `/auth/password-reset` | Сбросить пароль по коду                       |
| GET   | `/users/me`            | Получить текущего пользователя                |
| GET   | `/wallets`             | Получить кошельки                             |
| POST  | `/wallets`             | Создать кошелёк                               |
| GET   | `/balance`             | Получить общий баланс                         |
| GET   | `/operations`          | Получить операции                             |
| POST  | `/operation/income`    | Добавить доход                                |
| POST  | `/operation/expense`   | Добавить расход                               |
| POST  | `/operations/transfer` | Перевести деньги между кошельками             |

Защищённые маршруты требуют заголовок `Authorization: Bearer <JWT>`.

## Логирование

Приложение использует стандартный модуль `logging`. Логи выводятся в консоль в формате:

```
2026-09-26 14:00:00,000 [INFO] app.service.users: Запрос на сброс пароля от email: user@example.com
```

При ошибках SMTP-отправки выводится полный стек-трейс через `logger.exception()`, что упрощает отладку проблем с сетью и авторизацией на почтовом сервере.

## Тесты

Запуск всех тестов:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Проверка frontend JavaScript:

```powershell
node --check frontend\app.js
```

## Безопасность

Не добавляйте в Git:

- `.env`;
- SMTP App Password;
- `SECRET_KEY`;
- файлы SQLite-баз;
- локальные файлы PostgreSQL в `postgres_data/`;
- виртуальное окружение.

Для этого используется `.gitignore`. В `.env.example` должны быть только описания и фиктивные значения, никогда не реальные секреты.

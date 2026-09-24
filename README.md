# Finance Tracker

Небольшой трекер личных финансов на FastAPI, SQLAlchemy, SQLite и vanilla JavaScript.

Приложение позволяет:

- создавать кошельки в RUB, USD и EUR;
- добавлять доходы и расходы;
- переводить деньги между кошельками;
- смотреть общий баланс и историю операций;
- регистрироваться через email-код;
- входить после регистрации по email и паролю.

## Стек

- Python 3.10+
- FastAPI
- SQLAlchemy 2
- SQLite
- Pydantic 2
- JWT с алгоритмом HS256
- Argon2 для хеширования паролей
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

4. Создайте файл `.env` на основе `.env.example` и укажите значения:

```env
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SECRET_KEY=long-random-secret
```

Для Gmail используйте App Password, а не обычный пароль от аккаунта.

5. Запустите сервер:

```powershell
python -m uvicorn main:app --reload
```

После запуска:

- приложение: http://127.0.0.1:8000/
- Swagger UI: http://127.0.0.1:8000/docs

В Windows также можно запустить `start_server.bat`.

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

## Основные API-маршруты

Все маршруты имеют префикс `/api/v1`.

| Метод | Маршрут                | Назначение                                    |
| ----- | ---------------------- | --------------------------------------------- |
| POST  | `/users`               | Создать пользователя для регистрации          |
| POST  | `/auth/request-code`   | Отправить email-код                           |
| POST  | `/auth/verify-code`    | Подтвердить код, задать пароль и получить JWT |
| POST  | `/auth/login`          | Войти по email и паролю                       |
| GET   | `/users/me`            | Получить текущего пользователя                |
| GET   | `/wallets`             | Получить кошельки                             |
| POST  | `/wallets`             | Создать кошелёк                               |
| GET   | `/balance`             | Получить общий баланс                         |
| GET   | `/operations`          | Получить операции                             |
| POST  | `/operation/income`    | Добавить доход                                |
| POST  | `/operation/expense`   | Добавить расход                               |
| POST  | `/operations/transfer` | Перевести деньги между кошельками             |

Защищённые маршруты требуют заголовок `Authorization: Bearer <JWT>`.

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
- виртуальное окружение.

Для этого используется `.gitignore`. Публичным репозиторием делитесь только с заполненным `.env.example`, где нет настоящих секретов.

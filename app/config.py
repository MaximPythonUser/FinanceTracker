import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

# 1. Сначала грузим .env (положить значения в окружение)
load_dotenv()

# 2. Корень проекта — это родитель папки app/, где лежит этот файл
BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY_FILE = BASE_DIR / ".secret_key"


def _load_secret_key() -> str:
    # 3. Сначала смотрим в окружение (там живёт значение из .env)
    key = os.getenv("SECRET_KEY")
    if key:
        return key

# 4. Если в .env нет — читаем из локального файла (переживёт --reload)
    if SECRET_KEY_FILE.exists():
        stored = SECRET_KEY_FILE.read_text(encoding="utf-8").strip()
        if stored:
            return stored

    # 5. Ничего нет (или файл пустой) — генерируем новый и сохраняем в файл
    key = secrets.token_hex(32)
    SECRET_KEY_FILE.write_text(key, encoding="utf-8")
    return key


# 6. Единая точка истины: все модули импортируют именно это
SECRET_KEY = _load_secret_key()
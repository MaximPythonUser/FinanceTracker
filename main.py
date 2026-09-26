import logging

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.api.v1.wallets import router as wallets_router
from app.api.v1.operations import router as operations_router
from app.database import Base, engine, ensure_schema
from app.api.v1.users import router as users_router

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

# инициализация FastAPI приложения
app = FastAPI()

    # Подключаем роутер для кошелька с префиксом /api/v1 и тегом "wallet"
app.include_router(wallets_router, prefix="/api/v1", tags=["wallet"])
    # Подключаем роутер для операций с префиксом /api/v1 и тегом "operation"
app.include_router(operations_router, prefix="/api/v1", tags=["operation"])
app.include_router(users_router, prefix="/api/v1", tags=["user"])

app.mount("/static", StaticFiles(directory="frontend"), name="static")

ensure_schema()

@app.get("/", include_in_schema=False)
def read_frontend():
    return FileResponse("frontend/index.html")

Base.metadata.create_all(bind=engine)  # создаем таблицы в базе данных


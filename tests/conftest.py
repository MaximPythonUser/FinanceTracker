from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from app.service import users as users_service
from main import app
from app.database import Base
from app.dependency import get_db


TEST_DATABASE_URL = "sqlite:///./test.db"

test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(bind=test_engine,
                autocommit=False,
                autoflush=False)


def get_test_db() -> Generator[Session, None, None]:
    # Создаем новую сессию для работы с БД
    db = TestSessionLocal()
    try:
        # Возвращаем сессию через yield (это позволяет FastAPI работать с БД в тестовом режиме)
        yield db
    finally:
        # Закрываем сессию
        db.close()


# Подменяем зависимость get_db на тестовую версию
app.dependency_overrides[get_db] = get_test_db


@pytest.fixture()
def db() -> Generator[Session, None, None]:
    """Фикстура, предоставляющая тестовую сессию для прямого доступа к БД."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def setup_db() -> Generator[None, None, None]:
    # Пересоздаем все таблицы перед тестом
    Base.metadata.create_all(bind=test_engine)
    yield
    # Удаляем таблицы после теста, чтобы тесты были изолированы
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    # Создаем новую сесиию для работы с БД
    db = TestSessionLocal()
    try:
        # Возвращаем сессию через yield (это позволяет FastAPI работать с БД в тестовом режиме)
        yield db
    finally:
        # Закрываем сессию
        db.close()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Фикстура тестового клиента FastAPI."""
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def auth_headers():
    def create_headers(user_id: int):
        token = users_service.create_access_token(user_id)
        return {"Authorization": f"Bearer {token}"}
    return create_headers
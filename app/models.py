from decimal import Decimal
from datetime import datetime
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.enum import CurrencyEnum


class User(Base):
    # название таблицы в БД
    __tablename__ = "user"
    # Уникальный идентификатор (первичный ключ)
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str | None] = mapped_column(unique=True, nullable=True)
    login: Mapped[str] = mapped_column(unique=True)
    password_hash: Mapped[str | None] = mapped_column(nullable=True)




class Wallet(Base):
    #название таблицы в БД
    __tablename__ = "wallets"
    # Уникальный идентификатор (первичный ключ)
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    balance: Mapped[Decimal]
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)  # внешний ключ на таблицу User

    currency: Mapped[CurrencyEnum] = mapped_column(default=CurrencyEnum.RUB)


class Operation(Base):

    __tablename__ = "operation"
    id: Mapped[int] = mapped_column(primary_key=True)
    wallet_id: Mapped[int] = mapped_column(ForeignKey("wallets.id"))
    type: Mapped[str]
    amount: Mapped[Decimal]
    currency: Mapped[CurrencyEnum]
    description: Mapped[str | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(default=lambda : datetime.now())


class EmailCode(Base):
    __tablename__ = "email_codes"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    code_hash: Mapped[str]
    expires_at: Mapped[datetime]
    is_used: Mapped[bool] = mapped_column(default=False)

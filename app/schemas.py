
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field, field_validator
from fastapi import HTTPException

from app.enum import CurrencyEnum


class OperationRequest(BaseModel):
    wallet_name: str = Field(..., max_length=127)
    amount: Decimal
    description: str | None = Field(None, max_length=255)


    # валидатор для проверки что сумма положительная
    @field_validator('amount')
    def amount_must_be_positive(cls,v: Decimal) ->Decimal :
        # Проверяем что значение больше нуля
        if v <= 0:
            raise ValueError('Amount must be a positive')
        # Возвращаем значение еслди все ок
        return v

    @field_validator("wallet_name")
    def wallet_name_not_empty(cls, v: str) -> str:
        # убираем пробелы в начале и конце строки
        v = v.strip()

        # Проверяем что строка не пуста
        if not v:
            raise ValueError('Wallet name must not be empty')

        # Возвращаем очищенное значение
        return v

class CreateWalletRequest(BaseModel):
    name: str = Field(..., max_length=127)
    initial_balance: Decimal = 0

    currency: CurrencyEnum = CurrencyEnum.RUB

    @field_validator("name")
    def name_not_empty(cls, v: str) -> str:
            # убираем пробелы в начале и конце строки
        v = v.strip()
    
            # Проверяем что строка не пуста
        if not v:
            raise ValueError('Wallet name must not be empty')
    
            # Возвращаем очищенное значение
        return v

    @field_validator('initial_balance')
    def balance_not_negative(cls,v: Decimal) ->Decimal :
        # Проверяем что значение больше нуля
        if v < 0:
            raise ValueError('Initial balance cannot be negative')
        # Возвращаем значение еслди все ок
        return v

class UserRequest(BaseModel):
    #Логин пользователя(обязательное поле)
    login: str = Field(..., max_length=127)
    email: EmailStr = Field(..., max_length=127)



class RequestCodeRequest(BaseModel):
    email: EmailStr = Field(..., max_length=127)
    
    

class VerifyCodeRequest(BaseModel):
    email: EmailStr = Field(..., max_length=127)
    code: str = Field(..., min_length=6, max_length=6) 
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., max_length=127)
    password: str = Field(..., min_length=8, max_length=128)


class UserResponse(UserRequest):
    model_config = {"from_attributes": True}
    id: int

class WalletResponse(BaseModel):
    model_config = {"from_attributes": True}    
    id: int
    name: str
    balance: Decimal
    currency: CurrencyEnum

class OperationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    wallet_id: int
    type: str
    amount: Decimal
    currency: CurrencyEnum
    description: str | None
    created_at: datetime

class TransferCreateSchema(BaseModel): #тело запроса: перевод между кошельками
    from_wallet_id: int
    to_wallet_id: int
    amount: Decimal

    @field_validator("to_wallet_id")
    @classmethod
    def wallet_must_differ(
        cls, v: int, info
    ) -> int: #Нельзя переводить на тот же кошелек
        if "from_wallet_id" in info.data and v ==info.data["from_wallet_id"]:
            raise ValueError("Same wallets ids")
        return v
    @field_validator("amount")
    @classmethod
    def amount_gt_zero(cls, v: Decimal) -> Decimal: #сумма должна быть больше нуля
        if v <= 0:
            #Если отрицательное выбрасываем ошибку валидации
            raise ValueError("Amount cannot be negative")
        return v


class TotalBalance(BaseModel):
    total_balance: Decimal





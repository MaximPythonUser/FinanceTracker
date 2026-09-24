from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import User
from app.enum import OperationType
from app.repository import wallets as wallets_repository
from app.database import SessionLocal
from fastapi import HTTPException
from app.repository import operations as operations_repository
from app.schemas import OperationRequest, OperationResponse
from app.service.exchange_service import get_exchange_rate


def add_income(db: Session, current_user: User, operation: OperationRequest) -> OperationResponse:
    # проверим существование
    if not wallets_repository.is_wallet_exists(db, current_user.id, operation.wallet_name):
            raise HTTPException(
                status_code=404,
                detail=f"Wallet '{operation.wallet_name}' not found"
            )
        # добавляем доход к балансу кошелька
    wallet = wallets_repository.add_income(db, current_user.id, operation.wallet_name, operation.amount)
    operation = operations_repository.create_operation(
        db=db,
        wallet_id=wallet.id,
        type=OperationType.INCOME,
        amount=operation.amount,
        currency=wallet.currency,
        description=operation.description,
    )

    db.commit() 
    
        # возвращаем информацию о проведенной операции
    return OperationResponse.model_validate(operation)

def add_expense(db: Session, current_user: User, operation: OperationRequest) -> OperationResponse:
        # проверим существование
    if not wallets_repository.is_wallet_exists(db, current_user.id, operation.wallet_name):
        raise HTTPException(
                status_code=404,
                detail=f"Wallet '{operation.wallet_name}' not found"
                )

            # проверяем что сумма положительная
    if operation.amount <= 0:
        raise HTTPException(
                status_code=400,
                detail="Amount must be a positive number"
                )

        # проверяем достаточно ли средств на счете
    wallet = wallets_repository.get_wallets_balance_by_name(db, current_user.id, operation.wallet_name)
    if wallet.balance < operation.amount:
        raise HTTPException(
                status_code=400,
                detail=f"Insufficient funds. Available: {wallet.balance}"
                )
        # вычитаем расход из баланса кошелька
    wallet = wallets_repository.add_expense(db, current_user.id, operation.wallet_name, operation.amount)
    operation = operations_repository.create_operation(
            db=db,
            wallet_id=wallet.id,
            type=OperationType.EXPENSE,
            amount=operation.amount,
            currency=wallet.currency,
            description=operation.description,
        )
    # сохраняем операцию
    db.commit() 
        # Возвращаем информацию о проведенной операции
    return OperationResponse.model_validate(operation)

def get_operations_list(
        db: Session,
        current_user: User,
        wallet_id: int | None = None,
        date_from: datetime | None = None,   
        date_to: datetime | None = None,
) -> list[OperationResponse]:
    if wallet_id:
        wallet = wallets_repository.get_wallet_by_id(db, current_user.id, wallet_id)
        if not wallet:
            raise HTTPException(
                status_code=404,
                detail=f"Wallet '{wallet_id}' not found"
                #Если кошелька нет то ошибка - 404
            )
        wallets_ids = [wallet.id]
    else:
        wallets = wallets_repository.get_all_wallets(db, current_user.id)
        wallets_ids = [w.id for w in wallets]

    operations = operations_repository.get_operations_list(
        db,
        wallets_ids,
        date_from,
        date_to
    )
    result = []
    for operation in operations:
        result.append(OperationResponse.model_validate(operation))
    return result


async def transfer_between_wallets(
        db: Session, user_id: int, from_wallet_id: int, to_wallet_id: int, amount: Decimal
) -> OperationResponse:
    from_wallet = wallets_repository.get_wallet_by_id(db, user_id, from_wallet_id) #Исходный кошелек
    to_wallet = wallets_repository.get_wallet_by_id(db, user_id, to_wallet_id) #Конечный кошелек

    if not from_wallet or not to_wallet: #Любой из кашельков не найден
        raise HTTPException(
            status_code=404,
            detail=f"Wallet '{from_wallet_id}' or '{to_wallet_id}' not found"
        )

    if from_wallet.balance < amount: #Проверка достаточно ли средств
        raise HTTPException(
            status_code=400,
            detail=f"Not enough money: {from_wallet.balance} {from_wallet.currency}"
        )

    target_amount = amount #Сколько придет получателю
    exchange_rate = Decimal("1") #Курс валюты
    if from_wallet.currency != to_wallet.currency: #Если валюты разные
        exchange_rate = await get_exchange_rate(from_wallet.currency, to_wallet.currency)
        #Получаем курс асинхронно
    target_amount = round(amount * exchange_rate, 2)

    from_wallet.balance = round(from_wallet.balance - amount, 2) #Списываем
    to_wallet.balance = round(to_wallet.balance + target_amount, 2) #Получаем
    operation = operations_repository.create_operation(
        db=db,
        wallet_id=from_wallet_id,
        type=OperationType.TRANSFER,
        amount=target_amount,
        currency=to_wallet.currency,
        description="перевод",
    )
    db.add(from_wallet)
    db.add(to_wallet)
    db.add(operation)
    db.commit() #Сохраняем в БД
    return OperationResponse.model_validate(operation)

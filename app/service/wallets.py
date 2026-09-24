from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.enum import CurrencyEnum
from app.models import User
from app.repository import wallets as wallets_repository
from app.schemas import CreateWalletRequest, TotalBalance, WalletResponse
from app.service import exchange_service


async def get_total_balance(db: Session, current_user: User) -> TotalBalance:
        """
        Получение баланса кошелька по его имени.
        Если кошелек не найден, возвращается 0.
        """


        wallets = wallets_repository.get_all_wallets(db, current_user.id,)
        total_balance = Decimal(0)
        for wallet in wallets:
            if wallet.currency == CurrencyEnum.RUB:
                total_balance += wallet.balance
            else:
                exchange_rate = await exchange_service.get_exchange_rate(wallet.currency, CurrencyEnum.RUB)

                total_balance += exchange_rate * wallet.balance
            
            



        return TotalBalance(total_balance=total_balance) #Суммирует балансы всех кошельков
        

def create_wallet(db: Session, current_user: User, wallet: CreateWalletRequest) -> WalletResponse:
        """
        Создание нового кошелька с указанным именем и начальным балансом.
        Если кошелек с таким именем уже существует, возвращается ошибка.
        """
        if wallets_repository.is_wallet_exists(db, current_user.id, wallet.name):
            raise HTTPException(
                status_code=400,
                detail=f"Wallet '{wallet.name}' already exists"
            )

        # создаем новый кошелек с начальным балансом
        wallet = wallets_repository.create_wallet(db, current_user.id, wallet.name, wallet.initial_balance, wallet.currency)
        db.commit() 

        # возвращаем информацию о созданном кошельке
        return WalletResponse.model_validate(wallet)


def get_all_wallets(db: Session, current_user: User) -> list[WalletResponse]:
    wallets = wallets_repository.get_all_wallets(db, current_user.id,)
    return [WalletResponse.model_validate(wallet) for wallet in wallets]
    

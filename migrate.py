from sqlalchemy import create_engine, func, select, text
from sqlalchemy.orm import Session
from app.database import engine
from app.models import EmailCode, Operation, User, Wallet

def main() -> None:
    sqlite_engine = create_engine("sqlite:///./finance_tracker.db")

    with Session(sqlite_engine) as source:
        users = source.scalars(select(User)).all()
        wallets = source.scalars(select(Wallet)).all()
        operations = source.scalars(select(Operation)).all()

    with engine.begin() as target:
        for model in (User, Wallet, Operation, EmailCode):
            count = target.scalar(
                select(func.count()).select_from(model.__table__)
            )
            if count:
                raise RuntimeError(
                    f"Таблица {model.__tablename__} не пуста; перенос остановлен"
                )
        target.execute(
            User.__table__.insert(),
            [
                {
                    "id": user.id,
                    "email": user.email,
                    "login": user.login,
                    "password_hash": user.password_hash,
                }
                for user in users
            ],
        )
        target.execute(
            Wallet.__table__.insert(),
            [
                {
                    "id": wallet.id,
                    "name": wallet.name,
                    "balance": wallet.balance,
                    "user_id": wallet.user_id,
                    "currency": wallet.currency,
                }
                for wallet in wallets
            ],
        )
        target.execute(
            Operation.__table__.insert(),
            [
                {
                    "id": operation.id,
                    "wallet_id": operation.wallet_id,
                    "type": operation.type,
                    "amount": operation.amount,
                    "currency": operation.currency,
                    "description": operation.description,
                    "created_at": operation.created_at,
                }
                for operation in operations
            ],
        )
        for model in (User, Wallet, Operation):
            table = model.__table__
            quoted_table = engine.dialect.identifier_preparer.quote(table.name)
            target.execute(
                text(
                    f"SELECT setval(pg_get_serial_sequence(:table_name, 'id'), (SELECT MAX(id) FROM {quoted_table}))"
                ),
                {"table_name": f'"{table.name}"'},
            )
    with Session(engine) as target:
        for model in (User, Wallet, Operation):
            count = target.scalar(select(func.count()).select_from(model))
            print(f"Количество записей в таблице {model.__tablename__}: {count}")
    sqlite_engine.dispose()
if __name__ == "__main__":
    main()
from decimal import Decimal
from unittest.mock import patch

from app.enum import CurrencyEnum
from app.models import User, Wallet
from app.repository import users as users_repository
from app.service import users as users_service



def test_request_email_code_creates_code_and_sends_email(db_session):
    user = User(login="mail-user", email="mail-user@example.com")
    db_session.add(user)
    db_session.commit()

    with patch("app.service.email_service.send_email_code") as send_email_mock:
        code = users_service.request_email_code(db_session, user.email)

    assert code.isdigit()
    assert len(code) == 6
    assert users_repository.get_email_code(db_session, user.id) is not None
    send_email_mock.assert_called_once_with(user.email, code)


def test_add_expense_success(db_session, client, auth_headers):
    user = User(login="test")
    db_session.add(user)
    db_session.flush()
    wallet = Wallet(name="card", balance=200, user_id=user.id)
    db_session.add(wallet)
    db_session.commit()
    db_session.refresh(wallet)
    

    #Act

    response = client.post(
        "/api/v1/operation/expense",
        json={
            "wallet_name": "card",
            "amount": 50.0,
            "description": "food"
        },
        headers=auth_headers(user.id)
    )

    #Assert
    assert response.status_code == 200
    assert response.json()["type"] == "expense"
    assert Decimal(str(response.json()["amount"])) == Decimal(str(50))
    assert response.json()["description"] == "food"


def test_add_expense_negative_amount(db_session, client, auth_headers):
    #Arrange
    user = User(login="test")
    db_session.add(user)
    db_session.flush()
    wallet = Wallet(name="card", balance=200, user_id=user.id)
    db_session.add(wallet)
    db_session.commit()
    db_session.refresh(wallet)
    

    #Act
    response = client.post(
        "/api/v1/operation/expense",
        json={
            "wallet_name": "card",
            "amount": -100.0,
            "description": "food"
        },
        headers=auth_headers(user.id)
    )

    #Assert
    assert response.status_code == 422

def test_add_expense_empty_name(db_session, client, auth_headers):
    #Arrange
    user = User(login="test")
    db_session.add(user)
    db_session.flush()
    wallet = Wallet(name="card", balance=200, user_id=user.id)
    db_session.add(wallet)
    db_session.commit()
    db_session.refresh(wallet)
    

    #Act
    response = client.post(
        "/api/v1/operation/expense",
        json={
            "wallet_name": "   ",
            "amount": 100.0,
            "description": "food"
        },
        headers=auth_headers(user.id)

    )
    #Assert
    assert response.status_code == 422


def test_add_expense_wallet_not_exist(db_session, client, auth_headers):
    #Arrange
    user = User(login="test")
    db_session.add(user)
    db_session.commit()

    #Act
    response = client.post(
        "/api/v1/operation/expense",
        json={
            "wallet_name": "card",
            "amount": 100.0,
            "description": "food"
        },
        headers=auth_headers(user.id)

    )
    #Assert
    assert response.status_code == 404


def test_add_expense_unautorized(db_session, client):
    #Arrange

    #Act
    response = client.post(
        "/api/v1/operation/expense",
        json={
            "wallet_name": "card",
            "amount": 100.0,
            "description": "food"
        },
        headers={"Authorization": f"Bearer not exist"}

    )
    #Assert
    assert response.status_code == 401


def test_add_expense_not_enough_money(db_session, client, auth_headers):
    user = User(login="test")
    db_session.add(user)
    db_session.flush()
    wallet = Wallet(name="card", balance=200, user_id=user.id)
    db_session.add(wallet)
    db_session.commit()
    db_session.refresh(wallet)
    

    #Act

    response = client.post(
        "/api/v1/operation/expense",
        json={
            "wallet_name": "card",
            "amount": 250.0,
            "description": "food"
        },
        headers=auth_headers(user.id)
    )

    #Assert
    assert response.status_code == 400


def test_transfer_success(db_session, client, auth_headers):
    user = User(login="transfer-user")
    db_session.add(user)
    db_session.flush()
    source_wallet = Wallet(name="source", balance=200, user_id=user.id)
    target_wallet = Wallet(name="target", balance=50, user_id=user.id)
    db_session.add_all([source_wallet, target_wallet])
    db_session.commit()
    db_session.refresh(source_wallet)
    db_session.refresh(target_wallet)

    response = client.post(
        "/api/v1/operations/transfer",
        json={
            "from_wallet_id": source_wallet.id,
            "to_wallet_id": target_wallet.id,
            "amount": 75,
        },
        headers=auth_headers(user.id)
    )

    assert response.status_code == 200
    assert response.json()["type"] == "transfer"
    assert Decimal(str(response.json()["amount"])) == Decimal("75")

    db_session.refresh(source_wallet)
    db_session.refresh(target_wallet)
    assert source_wallet.balance == Decimal("125")
    assert target_wallet.balance == Decimal("125")


def test_transfer_between_different_currencies(db_session, client, auth_headers):
    user = User(login="currency-transfer-user")
    db_session.add(user)
    db_session.flush()
    source_wallet = Wallet(
        name="rub-source",
        balance=200,
        currency=CurrencyEnum.RUB,
        user_id=user.id,
    )
    target_wallet = Wallet(
        name="usd-target",
        balance=0,
        currency=CurrencyEnum.USD,
        user_id=user.id,
    )
    db_session.add_all([source_wallet, target_wallet])
    db_session.commit()
    db_session.refresh(source_wallet)
    db_session.refresh(target_wallet)

    response = client.post(
        "/api/v1/operations/transfer",
        json={
            "from_wallet_id": source_wallet.id,
            "to_wallet_id": target_wallet.id,
            "amount": 100,
        },
        headers=auth_headers(user.id)
    )

    assert response.status_code == 200
    db_session.refresh(source_wallet)
    db_session.refresh(target_wallet)
    assert source_wallet.balance == Decimal("100")
    assert target_wallet.balance == Decimal("1.05")
    
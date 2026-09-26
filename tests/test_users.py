import jwt

from app.dependency import SECRET_KEY
from app.models import User 
from datetime import datetime, timedelta, timezone
from app.models import EmailCode
from app.service.users import hash_code


def test_read_current_user(db_session, client, auth_headers):
    user = User(email="test@example.com", login="test1")
    db_session.add(user)
    db_session.commit()
    headers = auth_headers(user.id)
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["login"] == "test1"
    assert response.json()["email"] == "test@example.com"


def test_read_current_user_without_token(client):
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401


def test_read_current_user_invalid_token(client):
    response = client.get("/api/v1/users/me", headers={"Authorization": "Bearer invalid_token"})
    assert response.status_code == 401



def test_read_current_user_with_expired_token(client) -> None:
    payload = {
        "sub": "1",
        "exp": datetime.now(timezone.utc) - timedelta(minutes=30)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 401


def test_verify_code_returns_access_token(db_session, client):
    user = User(email="test@example.com", login="test1")
    db_session.add(user)
    db_session.commit()
    code = "123456"
    hash_code(code)
    email_code = EmailCode(code_hash=hash_code(code), user_id=user.id, expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7), is_used=False)
    db_session.add(email_code)
    db_session.commit()
    response = client.post("/api/v1/auth/verify-code", json={
        "email": "test@example.com",
        "code": "123456",
        "password": "strong-password"
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"
    data = response.json()
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_response = client.get("/api/v1/users/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["login"] == user.login
    assert me_response.json()["email"] == user.email

    login_response = client.post("/api/v1/auth/login", json={
        "email": user.email,
        "password": "strong-password",
    })
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()
    assert login_response.json()["token_type"] == "bearer"



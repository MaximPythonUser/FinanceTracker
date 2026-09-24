from datetime import datetime, timedelta
import os

from dotenv import load_dotenv
from fastapi import HTTPException
import hashlib

import jwt
from app.models import User
from app.repository import users as users_repository
from sqlalchemy.orm import Session
import secrets
from pwdlib import PasswordHash
from app.schemas import UserResponse
import app.service.email_service as email_service


load_dotenv()


SECRET_KEY = os.getenv("SECRET_KEY")
password_hash = PasswordHash.recommended()



def create_user(db: Session, login: str, email: str) -> UserResponse:
    if users_repository.get_user(db, login, email):
        raise HTTPException(status_code=400, detail="User with this login or email already exists")

    user = users_repository.create_user(db, login, email)
    db.commit()
    return UserResponse.model_validate(user)

def create_code() -> str:
    random_key = 100000 + secrets.randbelow(900000)
    code = str(random_key)
    return code


def request_email_code(db: Session, email: str):
    user = users_repository.get_user_by_email(db, email)
    if user is None:
        raise HTTPException(status_code=404, detail="User with this email not found")
    if user.password_hash:
        raise HTTPException(status_code=400, detail="User already registered. Use password login")

    code = create_code()
    code_hash = hash_code(code)
    expires_at = datetime.now() + timedelta(minutes=5)

    users_repository.create_email_code(db, user.id, code_hash, expires_at)
    db.commit()

    try:
        email_service.send_email_code(user.email, code)
    except Exception as exc:
        print(exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to send email with verification code",
        ) from exc

    return code


def hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def verify_email_code(db: Session, email: str, code: str, password: str):
    user = users_repository.get_user_by_email(db, email)
    if user is None:
        raise HTTPException(status_code=404, detail="User with this email not found")
    email_code = users_repository.get_email_code(db, user.id)
    if email_code is None:
        raise HTTPException(status_code=400, detail="Email code not found")
    if hash_code(code) != email_code.code_hash:
        raise HTTPException(status_code=400, detail="Code is not valid")
    if datetime.now() > email_code.expires_at:
        raise HTTPException(status_code=400, detail="Code is expired")
    if user.password_hash:
        raise HTTPException(status_code=400, detail="User already registered")
    email_code.is_used = True
    user.password_hash = password_hash.hash(password)
    token = create_access_token(user.id)
    db.commit()
    return {"access_token": token, "token_type": "bearer"}


def login_user(db: Session, email: str, password: str):
    user = users_repository.get_user_by_email(db, email)
    if user is None or not user.password_hash or not password_hash.verify(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"access_token": create_access_token(user.id), "token_type": "bearer"}


def create_access_token(user_id: int):
    payload = {
        "sub": str(user_id),
        "exp": datetime.now() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    


    

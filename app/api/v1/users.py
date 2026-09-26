

import logging

from fastapi import APIRouter, Depends

from sqlalchemy.orm import Session

from app.dependency import get_db, get_current_user
from app.models import User
from app.schemas import LoginRequest, PasswordResetRequest, RequestCodeRequest, UserRequest, UserResponse, VerifyCodeRequest
from app.service import users as users_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/users", response_model=UserResponse)
def create_user(payload: UserRequest, db: Session = Depends(get_db)):
    return users_service.create_user(db, payload.login, payload.email)

@router.get("/users/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.post("/auth/request-code")
def request_code(payload: RequestCodeRequest, db: Session = Depends(get_db)):
    users_service.request_email_code(db, payload.email)
    return {"message" : "Код отправлен на почту"}

@router.post("/auth/verify-code")
def verify_code(payload: VerifyCodeRequest, db: Session = Depends(get_db)):
    token_data = users_service.verify_email_code(db, payload.email, payload.code, payload.password)
    return token_data

@router.post("/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    return users_service.login_user(db, payload.email, payload.password)


@router.post("/auth/request-password-reset")
def request_password_reset(payload: RequestCodeRequest, db: Session = Depends(get_db)):
    logger.info("Запрос на сброс пароля от email: %s", payload.email)
    return users_service.request_password_reset(db, payload.email)

@router.post("/auth/password-reset")
def password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    return users_service.reset_password(db, payload.email, payload.code, payload.new_password)

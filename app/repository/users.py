

from datetime import datetime

from sqlalchemy import or_

from app.models import User, EmailCode


from sqlalchemy.orm import Session


def get_user(db: Session, login: str, email: str | None = None) -> User | None:
    query = db.query(User).filter(User.login == login)
    if email is not None:
        query = db.query(User).filter(or_(User.login == login, User.email == email))
    return query.scalar()


def create_user(db: Session, login: str, email: str) -> User:
    user = User(login=login, email=email)
    db.add(user)
    db.flush()
    return user

def create_email_code(db: Session, user_id: int, code_hash: str, expires_at: datetime):
    email_code = EmailCode(user_id=user_id, code_hash=code_hash, expires_at=expires_at)
    db.add(email_code)   
    db.flush()
    return email_code

def get_user_by_email(db: Session, email: str) -> User | None:
    query = db.query(User)
    user = query.filter(User.email == email).first()
    return user

def get_email_code(db: Session, user_id: int):
    email_code = (
        db.query(EmailCode)
        .filter(EmailCode.user_id == user_id)
        .filter(EmailCode.is_used == False)
        .order_by(EmailCode.id.desc())
        .first()
    )
    return email_code


def get_user_by_id(db: Session, user_id: int) -> User | None:
    query = db.query(User)
    user = query.filter(User.id == user_id).first()
    return user



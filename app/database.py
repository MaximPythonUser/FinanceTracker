from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker


DATABASE_URL = "sqlite:///./finance_tracker.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_schema() -> None:
	inspector = inspect(engine)
	if "user" not in inspector.get_table_names():
		return
	columns = {column["name"] for column in inspector.get_columns("user")}
	if "password_hash" not in columns:
		with engine.begin() as connection:
			connection.execute(text('ALTER TABLE "user" ADD COLUMN password_hash VARCHAR'))


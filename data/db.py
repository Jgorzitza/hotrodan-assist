"""Database engine and session helpers."""
from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

DATABASE_URL = (
    os.getenv("DATABASE_URL")
    or os.getenv("POSTGRES_URL")
    or "postgresql+psycopg2://postgres:postgres@localhost:5432/app"
)

engine: Engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal: sessionmaker[Session] = sessionmaker(
    bind=engine, expire_on_commit=False, autoflush=False
)


@contextmanager
def get_session() -> Generator[Session, None, None]:
    """Yield a session with commit/rollback semantics."""

    session: Session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

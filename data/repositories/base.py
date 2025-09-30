"""Shared repository helpers."""
from __future__ import annotations

from sqlalchemy.orm import Session


class Repository:
    """Lightweight base class that stores a SQLAlchemy session."""

    def __init__(self, session: Session) -> None:
        self.session = session

    @property
    def db(self) -> Session:
        return self.session

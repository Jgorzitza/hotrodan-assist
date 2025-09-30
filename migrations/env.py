"""Alembic environment configuration."""
from __future__ import annotations

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from data.models import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _get_database_url() -> str:
    url = config.get_main_option("sqlalchemy.url")
    if url:
        return url
    env_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
    if not env_url:
        raise RuntimeError("DATABASE_URL or POSTGRES_URL must be set for Alembic migrations")
    return env_url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""

    url = _get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = _get_database_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        future=True,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

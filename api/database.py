"""Async SQLAlchemy engine and session factory."""
from __future__ import annotations

import os

from sqlalchemy import URL
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

_USER     = os.getenv("DB_USER",     "sbr")
_PASSWORD = os.getenv("DB_PASSWORD", "sbr")
_HOST     = os.getenv("DB_HOST",     "localhost")
_PORT     = int(os.getenv("DB_PORT", "3306"))
_NAME     = os.getenv("DB_NAME",     "sbr")

DATABASE_URL = URL.create(
    drivername="mysql+aiomysql",
    username=_USER,
    password=_PASSWORD,
    host=_HOST,
    port=_PORT,
    database=_NAME,
)

engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

_SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields a DB session per request."""
    async with _SessionLocal() as session:
        yield session

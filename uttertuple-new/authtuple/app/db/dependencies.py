from typing import AsyncGenerator, Generator

from app.db.base import AsyncSessionLocal, SessionLocal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session


def get_db() -> Generator[Session, None, None]:
    """
    Get a database session for synchronous operations.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Get a database session for asynchronous operations.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

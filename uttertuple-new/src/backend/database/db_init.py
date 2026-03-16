import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from common.config import Configuration
from sqlalchemy.engine import URL
from sqlalchemy.ext.declarative import declarative_base
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base = declarative_base()
class Database:
    def __init__(self, config: Configuration):
        self.config = config
        self.engine = create_engine(
            url=URL.create(
                drivername="postgresql",
                username=self.config.configuration().postgresql_configuration.username,
                password=self.config.configuration().postgresql_configuration.password,
                host=self.config.configuration().postgresql_configuration.host,
                port=self.config.configuration().postgresql_configuration.port,
                database=self.config.configuration().postgresql_configuration.db
            ),
            pool_pre_ping=True,
        )
        self._session_factory = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.scoped = scoped_session(self._session_factory)

    @property
    def session(self):
        """Return the scoped session proxy (backwards-compatible with sessionmaker call syntax)."""
        return self.scoped

    def get_db(self):
        db = self._session_factory()
        try:
            yield db
        finally:
            db.close()

    def remove_session(self):
        """Remove the current scoped session, rolling back any failed transaction."""
        try:
            self.scoped.rollback()
        except Exception:
            pass
        self.scoped.remove()

    def init_db(self):
        """Initialize database by creating all tables."""
        try:
            logger.info("Creating database tables...")
            Base.metadata.create_all(bind=self.engine)
            logger.info("Database tables created successfully")
            return True
        except Exception as e:
            logger.error(f"Error creating database tables: {e}")
            return False
# from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, func
# from sqlalchemy.orm import relationship

# from app.db.base import Base


# class ProcessTracking(Base):
#     __tablename__ = "process_tracking"

#     id = Column(Integer, primary_key=True, index=True)
#     workflow_id = Column(String, index=True, nullable=False)
#     user_id = Column(String, index=True, nullable=False)
#     process_id = Column(Integer, nullable=False)
#     started_at = Column(DateTime, default=func.now(), nullable=False)
#     status = Column(String, nullable=False)  # "running", "completed", "terminated" 
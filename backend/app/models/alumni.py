from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text
)
from sqlalchemy.orm import relationship
from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class Alumni(Base):
    __tablename__ = "alumni"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    graduation_year = Column(Integer, nullable=True)
    course = Column(String(200), nullable=True)
    current_company = Column(String(200), nullable=True)
    current_role = Column(String(200), nullable=True)
    industry = Column(String(200), nullable=True)
    location = Column(String(200), nullable=True)
    linkedin_url = Column(String(500), nullable=True, unique=True, index=True)
    email = Column(String(200), nullable=True)
    is_placement_opportunity = Column(Boolean, default=False, nullable=False)
    placement_reason = Column(String(500), nullable=True)
    linkedin_verified = Column(Boolean, default=False, nullable=False)
    linkedin_last_checked = Column(DateTime, nullable=True)
    needs_update = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=_utcnow,
        onupdate=_utcnow,
        nullable=False,
    )

    career_history = relationship(
        "CareerHistory", back_populates="alumni", cascade="all, delete-orphan"
    )
    linkedin_snapshots = relationship(
        "LinkedInSnapshot", back_populates="alumni", cascade="all, delete-orphan"
    )


class CareerHistory(Base):
    __tablename__ = "career_history"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    alumni_id = Column(
        Integer, ForeignKey("alumni.id", ondelete="CASCADE"), nullable=False, index=True
    )
    company = Column(String(200), nullable=False)
    role = Column(String(200), nullable=False)
    start_year = Column(Integer, nullable=True)
    end_year = Column(Integer, nullable=True)
    industry = Column(String(200), nullable=True)
    location = Column(String(200), nullable=True)
    source = Column(String(50), default="excel", nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    alumni = relationship("Alumni", back_populates="career_history")


class LinkedInSnapshot(Base):
    __tablename__ = "linkedin_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    alumni_id = Column(
        Integer, ForeignKey("alumni.id", ondelete="CASCADE"), nullable=False, index=True
    )
    snapshot_data = Column(Text, nullable=True)
    checked_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    differences_found = Column(Boolean, default=False, nullable=False)

    alumni = relationship("Alumni", back_populates="linkedin_snapshots")

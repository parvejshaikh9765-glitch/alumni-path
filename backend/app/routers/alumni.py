from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.alumni import Alumni, CareerHistory
from app.schemas.alumni import AlumniCreate, AlumniOut, AlumniUpdate, CareerHistoryOut

router = APIRouter(tags=["alumni"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_alumni_or_404(alumni_id: int, db: Session) -> Alumni:
    alumni = db.query(Alumni).filter(Alumni.id == alumni_id).first()
    if not alumni:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alumni not found")
    return alumni


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[AlumniOut])
def list_alumni(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    name: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    graduation_year: Optional[int] = Query(None),
    is_placement_opportunity: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Alumni)

    if name:
        query = query.filter(Alumni.name.ilike(f"%{name}%"))
    if industry:
        query = query.filter(Alumni.industry.ilike(f"%{industry}%"))
    if company:
        query = query.filter(Alumni.current_company.ilike(f"%{company}%"))
    if role:
        query = query.filter(Alumni.current_role.ilike(f"%{role}%"))
    if location:
        query = query.filter(Alumni.location.ilike(f"%{location}%"))
    if graduation_year is not None:
        query = query.filter(Alumni.graduation_year == graduation_year)
    if is_placement_opportunity is not None:
        query = query.filter(Alumni.is_placement_opportunity.is_(is_placement_opportunity))

    return query.order_by(Alumni.name).offset(skip).limit(limit).all()


@router.get("/{alumni_id}", response_model=AlumniOut)
def get_alumni(alumni_id: int, db: Session = Depends(get_db)):
    return _get_alumni_or_404(alumni_id, db)


@router.post("/", response_model=AlumniOut, status_code=status.HTTP_201_CREATED)
def create_alumni(payload: AlumniCreate, db: Session = Depends(get_db)):
    # Prevent duplicate linkedin_url
    if payload.linkedin_url:
        existing = db.query(Alumni).filter(Alumni.linkedin_url == payload.linkedin_url).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An alumni with this LinkedIn URL already exists.",
            )

    alumni = Alumni(**payload.model_dump(exclude={"career_history"}))
    db.add(alumni)
    db.flush()

    for ch in payload.career_history:
        db.add(CareerHistory(alumni_id=alumni.id, **ch.model_dump()))

    db.commit()
    db.refresh(alumni)
    return alumni


@router.put("/{alumni_id}", response_model=AlumniOut)
def update_alumni(alumni_id: int, payload: AlumniUpdate, db: Session = Depends(get_db)):
    alumni = _get_alumni_or_404(alumni_id, db)
    update_data = payload.model_dump(exclude_unset=True)

    # Guard against duplicate linkedin_url
    if "linkedin_url" in update_data and update_data["linkedin_url"]:
        clash = (
            db.query(Alumni)
            .filter(
                Alumni.linkedin_url == update_data["linkedin_url"],
                Alumni.id != alumni_id,
            )
            .first()
        )
        if clash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another alumni with this LinkedIn URL already exists.",
            )

    for field, value in update_data.items():
        setattr(alumni, field, value)

    db.commit()
    db.refresh(alumni)
    return alumni


@router.delete("/{alumni_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alumni(alumni_id: int, db: Session = Depends(get_db)):
    alumni = _get_alumni_or_404(alumni_id, db)
    db.delete(alumni)
    db.commit()


@router.get("/{alumni_id}/timeline", response_model=List[CareerHistoryOut])
def get_career_timeline(alumni_id: int, db: Session = Depends(get_db)):
    _get_alumni_or_404(alumni_id, db)
    history = (
        db.query(CareerHistory)
        .filter(CareerHistory.alumni_id == alumni_id)
        .order_by(CareerHistory.start_year.asc().nullsfirst())
        .all()
    )
    return history


@router.post("/{alumni_id}/mark-opportunity", response_model=AlumniOut)
def mark_placement_opportunity(
    alumni_id: int,
    reason: str = Query(..., min_length=1, description="Reason for flagging as placement opportunity"),
    db: Session = Depends(get_db),
):
    alumni = _get_alumni_or_404(alumni_id, db)
    alumni.is_placement_opportunity = True
    alumni.placement_reason = reason
    db.commit()
    db.refresh(alumni)
    return alumni

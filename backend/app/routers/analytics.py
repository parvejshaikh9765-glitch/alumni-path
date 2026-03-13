from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.alumni import AlumniOut
from app.services import ai_analytics

router = APIRouter(tags=["analytics"])


@router.get("/top-companies")
def top_companies(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return ai_analytics.get_top_companies(db, limit=limit)


@router.get("/industry-distribution")
def industry_distribution(db: Session = Depends(get_db)):
    return ai_analytics.get_industry_distribution(db)


@router.get("/first-jobs")
def first_jobs(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return ai_analytics.get_first_job_roles(db, limit=limit)


@router.get("/placement-opportunities", response_model=list[AlumniOut])
def placement_opportunities(db: Session = Depends(get_db)):
    return ai_analytics.get_placement_opportunities(db)


@router.get("/career-growth")
def career_growth(db: Session = Depends(get_db)):
    return ai_analytics.get_career_growth_stats(db)


@router.get("/geography")
def geography(db: Session = Depends(get_db)):
    return ai_analytics.get_geography_distribution(db)


@router.get("/graduation-years")
def graduation_years(db: Session = Depends(get_db)):
    return ai_analytics.get_graduation_year_distribution(db)


@router.get("/network-graph")
def network_graph(db: Session = Depends(get_db)):
    return ai_analytics.get_alumni_network_graph(db)

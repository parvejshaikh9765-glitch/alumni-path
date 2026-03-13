import logging
from typing import List

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.alumni import Alumni, CareerHistory
from app.schemas.alumni import AlumniOut

logger = logging.getLogger(__name__)


def get_top_companies(db: Session, limit: int = 10) -> List[dict]:
    """Return the top N employers by headcount."""
    rows = (
        db.query(Alumni.current_company, func.count(Alumni.id).label("count"))
        .filter(Alumni.current_company.isnot(None))
        .group_by(Alumni.current_company)
        .order_by(func.count(Alumni.id).desc())
        .limit(limit)
        .all()
    )
    return [{"company": r.current_company, "count": r.count} for r in rows]


def get_industry_distribution(db: Session) -> List[dict]:
    """Return alumni counts per industry with percentage share."""
    rows = (
        db.query(Alumni.industry, func.count(Alumni.id).label("count"))
        .filter(Alumni.industry.isnot(None))
        .group_by(Alumni.industry)
        .order_by(func.count(Alumni.id).desc())
        .all()
    )
    total = sum(r.count for r in rows) or 1
    return [
        {
            "industry": r.industry,
            "count": r.count,
            "percentage": round(r.count / total * 100, 2),
        }
        for r in rows
    ]


def get_first_job_roles(db: Session, limit: int = 10) -> List[dict]:
    """Return the most common first job roles across all alumni."""
    # Subquery: minimum start_year per alumni
    subq = (
        db.query(
            CareerHistory.alumni_id,
            func.min(CareerHistory.start_year).label("min_year"),
        )
        .filter(CareerHistory.start_year.isnot(None))
        .group_by(CareerHistory.alumni_id)
        .subquery()
    )

    rows = (
        db.query(CareerHistory.role, func.count(CareerHistory.id).label("count"))
        .join(
            subq,
            (CareerHistory.alumni_id == subq.c.alumni_id)
            & (CareerHistory.start_year == subq.c.min_year),
        )
        .group_by(CareerHistory.role)
        .order_by(func.count(CareerHistory.id).desc())
        .limit(limit)
        .all()
    )
    return [{"role": r.role, "count": r.count} for r in rows]


def get_placement_opportunities(db: Session) -> List[AlumniOut]:
    """Return alumni flagged as placement opportunities."""
    alumni = (
        db.query(Alumni)
        .filter(Alumni.is_placement_opportunity.is_(True))
        .order_by(Alumni.name)
        .all()
    )
    return [AlumniOut.model_validate(a) for a in alumni]


def get_career_growth_stats(db: Session) -> dict:
    """
    Calculate aggregate career growth statistics:
    - Average number of job changes per alumni
    - Average number of distinct companies per alumni
    """
    alumni_ids = [row[0] for row in db.query(Alumni.id).all()]

    if not alumni_ids:
        return {
            "average_job_changes": 0,
            "average_companies_per_alumni": 0,
            "total_alumni_analysed": 0,
        }

    job_counts = (
        db.query(
            CareerHistory.alumni_id,
            func.count(CareerHistory.id).label("job_count"),
        )
        .group_by(CareerHistory.alumni_id)
        .all()
    )

    company_counts = (
        db.query(
            CareerHistory.alumni_id,
            func.count(func.distinct(CareerHistory.company)).label("company_count"),
        )
        .group_by(CareerHistory.alumni_id)
        .all()
    )

    avg_jobs = (
        sum(r.job_count for r in job_counts) / len(job_counts)
        if job_counts
        else 0
    )
    avg_companies = (
        sum(r.company_count for r in company_counts) / len(company_counts)
        if company_counts
        else 0
    )

    return {
        "average_job_changes": round(avg_jobs, 2),
        "average_companies_per_alumni": round(avg_companies, 2),
        "total_alumni_analysed": len(alumni_ids),
    }


def get_geography_distribution(db: Session) -> List[dict]:
    """Return alumni count grouped by location, sorted descending."""
    rows = (
        db.query(Alumni.location, func.count(Alumni.id).label("count"))
        .filter(Alumni.location.isnot(None))
        .group_by(Alumni.location)
        .order_by(func.count(Alumni.id).desc())
        .all()
    )
    return [{"location": r.location, "count": r.count} for r in rows]


def get_graduation_year_distribution(db: Session) -> List[dict]:
    """Return alumni count grouped by graduation year, sorted by year."""
    rows = (
        db.query(Alumni.graduation_year, func.count(Alumni.id).label("count"))
        .filter(Alumni.graduation_year.isnot(None))
        .group_by(Alumni.graduation_year)
        .order_by(Alumni.graduation_year)
        .all()
    )
    return [{"graduation_year": r.graduation_year, "count": r.count} for r in rows]


def get_alumni_network_graph(db: Session) -> dict:
    """
    Build a lightweight network graph suitable for front-end visualisation.

    Nodes: alumni, company, industry
    Edges: alumni -> company (current_company), company -> industry
    """
    alumni_list = (
        db.query(Alumni.id, Alumni.name, Alumni.current_company, Alumni.industry)
        .all()
    )

    nodes: list[dict] = []
    edges: list[dict] = []
    seen_companies: set[str] = set()
    seen_industries: set[str] = set()

    for a in alumni_list:
        alumni_node_id = f"alumni_{a.id}"
        nodes.append({"id": alumni_node_id, "label": a.name, "type": "alumni"})

        if a.current_company:
            company_node_id = f"company_{a.current_company}"
            if a.current_company not in seen_companies:
                nodes.append(
                    {
                        "id": company_node_id,
                        "label": a.current_company,
                        "type": "company",
                    }
                )
                seen_companies.add(a.current_company)
            edges.append({"source": alumni_node_id, "target": company_node_id})

            if a.industry:
                industry_node_id = f"industry_{a.industry}"
                if a.industry not in seen_industries:
                    nodes.append(
                        {
                            "id": industry_node_id,
                            "label": a.industry,
                            "type": "industry",
                        }
                    )
                    seen_industries.add(a.industry)
                edges.append({"source": company_node_id, "target": industry_node_id})

    return {"nodes": nodes, "edges": edges}

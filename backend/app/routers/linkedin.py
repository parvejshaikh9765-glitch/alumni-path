import logging
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.alumni import Alumni, LinkedInSnapshot
from app.schemas.alumni import LinkedInEnrichmentResponse
from app.services.linkedin_enrichment import LinkedInEnricher

logger = logging.getLogger(__name__)
router = APIRouter(tags=["linkedin"])


def _get_alumni_or_404(alumni_id: int, db: Session) -> Alumni:
    alumni = db.query(Alumni).filter(Alumni.id == alumni_id).first()
    if not alumni:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alumni not found")
    return alumni


@router.post("/enrich/{alumni_id}", response_model=LinkedInEnrichmentResponse)
async def enrich_alumni(alumni_id: int, db: Session = Depends(get_db)):
    """Fetch LinkedIn data for a single alumni and detect career changes."""
    _get_alumni_or_404(alumni_id, db)
    enricher = LinkedInEnricher()
    try:
        result = await enricher.enrich_alumni(alumni_id, db)
    finally:
        await enricher.close()

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=result["error"]
        )
    return result


async def _enrich_all_task(alumni_ids: List[int], db: Session):
    """Background coroutine that enriches every alumni in the list sequentially."""
    enricher = LinkedInEnricher()
    try:
        for alumni_id in alumni_ids:
            try:
                await enricher.enrich_alumni(alumni_id, db)
            except Exception as exc:  # noqa: BLE001
                logger.error("Error enriching alumni %d: %s", alumni_id, exc)
    finally:
        await enricher.close()


@router.post("/enrich-all", status_code=status.HTTP_202_ACCEPTED)
async def enrich_all(
    background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    """Trigger background enrichment for all alumni that have a LinkedIn URL."""
    alumni_ids = [
        row[0]
        for row in db.query(Alumni.id).filter(Alumni.linkedin_url.isnot(None)).all()
    ]

    if not alumni_ids:
        return {"message": "No alumni with LinkedIn URLs found.", "queued": 0}

    background_tasks.add_task(_enrich_all_task, alumni_ids, db)

    return {
        "message": "Enrichment started in the background.",
        "queued": len(alumni_ids),
    }


@router.get("/status/{alumni_id}")
def enrichment_status(alumni_id: int, db: Session = Depends(get_db)):
    """Return the most recent LinkedIn snapshot for an alumni."""
    _get_alumni_or_404(alumni_id, db)

    snapshot: LinkedInSnapshot | None = (
        db.query(LinkedInSnapshot)
        .filter(LinkedInSnapshot.alumni_id == alumni_id)
        .order_by(LinkedInSnapshot.checked_at.desc())
        .first()
    )

    if not snapshot:
        return {"alumni_id": alumni_id, "status": "never_checked", "snapshot": None}

    return {
        "alumni_id": alumni_id,
        "status": "checked",
        "last_checked": snapshot.checked_at,
        "differences_found": snapshot.differences_found,
        "snapshot": snapshot.snapshot_data,
    }


@router.get("/needs-update")
def alumni_needing_update(db: Session = Depends(get_db)):
    """List alumni whose records differ from their LinkedIn profile."""
    alumni = (
        db.query(Alumni)
        .filter(Alumni.needs_update.is_(True))
        .order_by(Alumni.linkedin_last_checked.asc())
        .all()
    )
    return [
        {
            "id": a.id,
            "name": a.name,
            "linkedin_url": a.linkedin_url,
            "linkedin_last_checked": a.linkedin_last_checked,
        }
        for a in alumni
    ]

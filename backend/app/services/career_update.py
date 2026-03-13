import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Callable

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.models.alumni import Alumni
from app.services.linkedin_enrichment import LinkedInEnricher

logger = logging.getLogger(__name__)

_STALE_AFTER_DAYS = 7


class CareerUpdateScheduler:
    def __init__(self, db_factory: Callable[[], Session]):
        self._db_factory = db_factory
        self._scheduler = BackgroundScheduler(timezone="UTC")

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self):
        """Start the background scheduler."""
        self._scheduler.add_job(
            self.run_periodic_updates,
            trigger="interval",
            hours=24,
            id="periodic_linkedin_update",
            replace_existing=True,
        )
        self._scheduler.start()
        logger.info("CareerUpdateScheduler started.")

    def stop(self):
        """Stop the background scheduler gracefully."""
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)
            logger.info("CareerUpdateScheduler stopped.")

    # kept for backwards compatibility in case callers use setup_scheduler
    def setup_scheduler(self, app):
        """Deprecated: use start()/stop() directly from lifespan hooks."""
        self.start()

    # ------------------------------------------------------------------
    # Scheduled task
    # ------------------------------------------------------------------

    def run_periodic_updates(self):
        """Fetch LinkedIn data for alumni whose profiles are stale or unchecked."""
        db: Session = self._db_factory()
        enricher = LinkedInEnricher()
        stale_cutoff = datetime.now(timezone.utc) - timedelta(days=_STALE_AFTER_DAYS)

        try:
            alumni_to_update = (
                db.query(Alumni)
                .filter(
                    Alumni.linkedin_url.isnot(None),
                    (Alumni.linkedin_last_checked.is_(None))
                    | (Alumni.linkedin_last_checked < stale_cutoff),
                )
                .all()
            )

            logger.info(
                "Periodic update: %d alumni to enrich.", len(alumni_to_update)
            )

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                for alumni in alumni_to_update:
                    try:
                        result = loop.run_until_complete(
                            enricher.enrich_alumni(alumni.id, db)
                        )
                        logger.info(
                            "Enriched alumni %d: differences_found=%s",
                            alumni.id,
                            result.get("differences_found"),
                        )
                    except Exception as exc:  # noqa: BLE001
                        logger.error(
                            "Error enriching alumni %d: %s", alumni.id, exc
                        )
            finally:
                loop.run_until_complete(enricher.close())
                loop.close()

        except Exception as exc:  # noqa: BLE001
            logger.error("Periodic update failed: %s", exc)
        finally:
            db.close()

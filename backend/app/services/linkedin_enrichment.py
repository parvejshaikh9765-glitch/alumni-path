import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.config import settings
from app.models.alumni import Alumni, LinkedInSnapshot

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://www.google.com/",
    "DNT": "1",
}


class LinkedInEnricher:
    def __init__(self):
        self._client = httpx.AsyncClient(
            headers=_HEADERS,
            follow_redirects=True,
            timeout=30.0,
        )

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    async def fetch_profile(self, linkedin_url: str) -> Optional[dict]:
        """
        Fetch a LinkedIn public profile page and extract structured data.

        Returns a dict with extracted fields, or None on failure.
        """
        await asyncio.sleep(settings.LINKEDIN_SCRAPE_DELAY)
        try:
            response = await self._client.get(linkedin_url)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("HTTP error fetching %s: %s", linkedin_url, exc)
            return None
        except Exception as exc:  # noqa: BLE001
            logger.warning("Unexpected error fetching %s: %s", linkedin_url, exc)
            return None

        return self._parse_profile_html(response.text)

    def compare_with_excel(self, alumni: Alumni, linkedin_data: dict) -> dict:
        """
        Compare the alumni's current DB record with freshly fetched LinkedIn data.

        Returns a dict of fields that differ:
            {"field": {"excel": old_value, "linkedin": new_value}}
        """
        differences: dict = {}
        fields_to_compare = {
            "current_company": linkedin_data.get("current_company"),
            "current_role": linkedin_data.get("current_role"),
            "location": linkedin_data.get("location"),
        }

        for field, linkedin_val in fields_to_compare.items():
            if not linkedin_val:
                continue
            excel_val = getattr(alumni, field, None)
            if excel_val != linkedin_val:
                differences[field] = {"excel": excel_val, "linkedin": linkedin_val}

        return differences

    async def enrich_alumni(self, alumni_id: int, db: Session) -> dict:
        """Fetch LinkedIn data for a single alumni and persist the result."""
        alumni: Optional[Alumni] = db.query(Alumni).filter(Alumni.id == alumni_id).first()
        if not alumni:
            return {"error": "alumni not found"}

        if not alumni.linkedin_url:
            return {"error": "no linkedin url"}

        linkedin_data = await self.fetch_profile(alumni.linkedin_url)

        differences: dict = {}
        differences_found = False

        if linkedin_data:
            differences = self.compare_with_excel(alumni, linkedin_data)
            differences_found = bool(differences)

            if differences_found:
                alumni.needs_update = True

        # Always record the verification attempt
        alumni.linkedin_verified = True
        alumni.linkedin_last_checked = datetime.now(timezone.utc)

        snapshot = LinkedInSnapshot(
            alumni_id=alumni.id,
            snapshot_data=json.dumps(linkedin_data) if linkedin_data else None,
            checked_at=datetime.now(timezone.utc),
            differences_found=differences_found,
        )
        db.add(snapshot)
        db.commit()

        return {
            "alumni_id": alumni_id,
            "differences_found": differences_found,
            "differences": differences,
            "updated": differences_found,
        }

    async def close(self):
        await self._client.aclose()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _parse_profile_html(self, html: str) -> dict:
        soup = BeautifulSoup(html, "lxml")

        result: dict = {
            "name": None,
            "headline": None,
            "location": None,
            "current_role": None,
            "current_company": None,
            "raw_html_length": len(html),
        }

        # --- Open Graph / meta tags ---
        og_title = soup.find("meta", property="og:title")
        if og_title:
            result["name"] = og_title.get("content", "").strip() or None

        og_desc = soup.find("meta", property="og:description")
        if og_desc:
            result["headline"] = og_desc.get("content", "").strip() or None

        # <title> as fallback for name
        if not result["name"] and soup.title:
            result["name"] = soup.title.string.strip() if soup.title.string else None

        # Meta description for location hints
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and not result["headline"]:
            result["headline"] = meta_desc.get("content", "").strip() or None

        # --- JSON-LD structured data ---
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
                if isinstance(data, dict):
                    self._extract_jsonld(data, result)
            except (json.JSONDecodeError, AttributeError):
                continue

        # --- Derive current_role / current_company from headline ---
        if result["headline"] and not result["current_role"]:
            self._parse_headline(result)

        return result

    def _extract_jsonld(self, data: dict, result: dict):
        """Populate result from a JSON-LD object when available."""
        schema_type = data.get("@type", "")
        if schema_type == "Person":
            result["name"] = result["name"] or data.get("name")
            result["location"] = result["location"] or (
                data.get("address", {}).get("addressLocality") if isinstance(data.get("address"), dict) else None
            )
            job_title = data.get("jobTitle")
            if job_title:
                result["current_role"] = job_title
            works_for = data.get("worksFor")
            if isinstance(works_for, dict):
                result["current_company"] = works_for.get("name")
            elif isinstance(works_for, list) and works_for:
                result["current_company"] = works_for[0].get("name")

    def _parse_headline(self, result: dict):
        """
        Attempt to split a LinkedIn headline like 'Software Engineer at Acme Corp'
        into role and company.
        """
        headline: str = result["headline"] or ""
        for separator in (" at ", " @ ", " | ", " - "):
            if separator in headline:
                parts = headline.split(separator, 1)
                result["current_role"] = parts[0].strip()
                result["current_company"] = parts[1].strip()
                return
        # If no separator found, treat the whole headline as the role
        result["current_role"] = headline.strip() or None

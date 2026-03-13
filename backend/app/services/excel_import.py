import logging
from io import BytesIO
from typing import List

import pandas as pd
from sqlalchemy.orm import Session

from app.models.alumni import Alumni, CareerHistory

logger = logging.getLogger(__name__)

# Keywords that indicate a placement/hiring opportunity
PLACEMENT_KEYWORDS = [
    "hr", "recruiter", "hiring manager", "founder", "ceo", "cto",
    "vp", "director", "senior",
]

# Mapping of alternate column names to canonical names
COLUMN_ALIASES: dict[str, str] = {
    "grad_year": "graduation_year",
    "graduation": "graduation_year",
    "year": "graduation_year",
    "job_role": "role",
    "position": "role",
    "title": "role",
    "designation": "role",
    "linkedin": "linkedin_url",
    "linkedin_profile": "linkedin_url",
    "profile_url": "linkedin_url",
    "start": "start_year",
    "from_year": "start_year",
    "from": "start_year",
    "end": "end_year",
    "to_year": "end_year",
    "to": "end_year",
}


def parse_excel_file(file_bytes: bytes) -> pd.DataFrame:
    """Read an xlsx file from raw bytes and normalise column names."""
    df = pd.read_excel(BytesIO(file_bytes), engine="openpyxl")

    # Normalise column names
    df.columns = [
        str(col).strip().lower().replace(" ", "_") for col in df.columns
    ]

    # Apply alias mapping
    df.rename(columns=COLUMN_ALIASES, inplace=True)

    return df


def _is_placement_opportunity(role: str) -> tuple[bool, str]:
    """Return (True, matched_keyword) if the role suggests a hiring contact."""
    if not role:
        return False, ""
    role_lower = role.lower()
    for keyword in PLACEMENT_KEYWORDS:
        if keyword in role_lower:
            return True, keyword
    return False, ""


def _most_recent_job(rows: list[dict]) -> dict:
    """Return the row representing the current / most recent position."""
    # Prefer entries where end_year is None/NaN (still in role)
    current = [r for r in rows if not r.get("end_year")]
    candidates = current if current else rows

    def sort_key(r):
        return r.get("start_year") or 0

    return max(candidates, key=sort_key)


def import_alumni_from_df(df: pd.DataFrame, db: Session) -> dict:
    """
    Import alumni records from a normalised DataFrame.

    Returns a stats dict with keys:
        alumni_created, alumni_updated, errors, total_rows
    """
    stats: dict = {
        "alumni_created": 0,
        "alumni_updated": 0,
        "errors": [],
        "total_rows": len(df),
    }

    if df.empty:
        return stats

    # Ensure required 'name' column exists
    if "name" not in df.columns:
        stats["errors"].append("Missing required column: 'name'")
        return stats

    # Replace pandas NA with Python None for clean comparisons
    df = df.where(pd.notnull(df), None)

    # Group by normalised name (coerce to str to handle numeric-only name cells)
    df["_name_lower"] = df["name"].astype(str).str.strip().str.lower()
    grouped = df.groupby("_name_lower", sort=False)

    for name_lower, group in grouped:
        try:
            rows = group.to_dict(orient="records")
            first = rows[0]

            raw_name: str = str(first.get("name") or "").strip()
            linkedin_url: str | None = (
                str(first.get("linkedin_url")).strip()
                if first.get("linkedin_url")
                else None
            )

            # Find existing alumni by name or linkedin_url
            existing: Alumni | None = None
            if linkedin_url:
                existing = (
                    db.query(Alumni)
                    .filter(Alumni.linkedin_url == linkedin_url)
                    .first()
                )
            if existing is None:
                existing = (
                    db.query(Alumni)
                    .filter(Alumni.name.ilike(raw_name))
                    .first()
                )

            if existing is None:
                alumni = Alumni(
                    name=raw_name,
                    graduation_year=_safe_int(first.get("graduation_year")),
                    course=_safe_str(first.get("course")),
                    location=_safe_str(first.get("location")),
                    linkedin_url=linkedin_url,
                    email=_safe_str(first.get("email")),
                    industry=_safe_str(first.get("industry")),
                )
                db.add(alumni)
                db.flush()  # obtain alumni.id before adding children
                stats["alumni_created"] += 1
            else:
                alumni = existing
                stats["alumni_updated"] += 1

            # Build career history entries for this import batch
            career_rows: list[dict] = []
            for row in rows:
                company = _safe_str(row.get("company"))
                role = _safe_str(row.get("role"))
                if not company or not role:
                    stats["errors"].append(
                        f"Row for '{raw_name}' skipped: missing company or role"
                    )
                    continue

                career_entry = CareerHistory(
                    alumni_id=alumni.id,
                    company=company,
                    role=role,
                    start_year=_safe_int(row.get("start_year")),
                    end_year=_safe_int(row.get("end_year")),
                    industry=_safe_str(row.get("industry")),
                    location=_safe_str(row.get("location")),
                    source="excel",
                )
                db.add(career_entry)
                career_rows.append(
                    {
                        "company": company,
                        "role": role,
                        "start_year": _safe_int(row.get("start_year")),
                        "end_year": _safe_int(row.get("end_year")),
                    }
                )

            # Update current position to the most recent role
            if career_rows:
                recent = _most_recent_job(career_rows)
                alumni.current_company = recent["company"]
                alumni.current_role = recent["role"]

                # Detect placement opportunity from most recent role
                is_opp, keyword = _is_placement_opportunity(recent["role"])
                if is_opp:
                    alumni.is_placement_opportunity = True
                    alumni.placement_reason = (
                        f"Role contains keyword: '{keyword}'"
                    )

            db.commit()

        except Exception as exc:  # noqa: BLE001
            db.rollback()
            logger.exception("Error importing alumni '%s'", name_lower)
            stats["errors"].append(f"Error for '{name_lower}': {exc}")

    return stats


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_str(value) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    return s if s else None


def _safe_int(value) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None

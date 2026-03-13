import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.schemas.alumni import UploadResponse
from app.services.excel_import import import_alumni_from_df, parse_excel_file

router = APIRouter(tags=["upload"])

_MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB


@router.post("/excel", response_model=UploadResponse, status_code=status.HTTP_200_OK)
async def upload_excel(file: UploadFile, db: Session = Depends(get_db)):
    """
    Accept an .xlsx file, parse it, and import alumni records into the database.
    """
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .xlsx files are supported.",
        )

    file_bytes = await file.read()

    if len(file_bytes) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {_MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    # Optionally persist the raw file for audit purposes
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    save_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    with open(save_path, "wb") as f:
        f.write(file_bytes)

    try:
        df = parse_excel_file(file_bytes)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse Excel file: {exc}",
        ) from exc

    result = import_alumni_from_df(df, db)

    return UploadResponse(
        message="Upload complete.",
        total_rows=result["total_rows"],
        alumni_created=result["alumni_created"],
        alumni_updated=result["alumni_updated"],
        errors=result["errors"],
    )

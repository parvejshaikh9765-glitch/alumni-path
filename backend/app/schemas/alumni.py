from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class CareerHistoryBase(BaseModel):
    company: str
    role: str
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    source: str = "excel"


class CareerHistoryCreate(CareerHistoryBase):
    pass


class CareerHistoryOut(CareerHistoryBase):
    id: int
    alumni_id: int

    model_config = ConfigDict(from_attributes=True)


class AlumniBase(BaseModel):
    name: str
    graduation_year: Optional[int] = None
    course: Optional[str] = None
    current_company: Optional[str] = None
    current_role: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    email: Optional[str] = None


class AlumniCreate(AlumniBase):
    career_history: List[CareerHistoryCreate] = []


class AlumniUpdate(BaseModel):
    name: Optional[str] = None
    graduation_year: Optional[int] = None
    course: Optional[str] = None
    current_company: Optional[str] = None
    current_role: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    email: Optional[str] = None
    is_placement_opportunity: Optional[bool] = None
    placement_reason: Optional[str] = None
    needs_update: Optional[bool] = None


class AlumniOut(AlumniBase):
    id: int
    is_placement_opportunity: bool
    placement_reason: Optional[str] = None
    linkedin_verified: bool
    needs_update: bool
    created_at: datetime
    updated_at: datetime
    career_history: List[CareerHistoryOut] = []

    model_config = ConfigDict(from_attributes=True)


class AlumniSearchParams(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    location: Optional[str] = None
    graduation_year: Optional[int] = None
    is_placement_opportunity: Optional[bool] = None


class UploadResponse(BaseModel):
    message: str
    total_rows: int
    alumni_created: int
    alumni_updated: int
    errors: List[str]


class LinkedInEnrichmentResponse(BaseModel):
    alumni_id: int
    differences_found: bool
    differences: Dict
    updated: bool

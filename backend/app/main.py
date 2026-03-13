import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.routers import alumni, analytics, linkedin, upload
from app.services.career_update import CareerUpdateScheduler


def create_app() -> FastAPI:
    application = FastAPI(
        title="Alumni Intelligence Platform",
        version="1.0.0",
        description="Backend API for the Alumni Intelligence and Career Analytics Platform",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(alumni.router, prefix="/api/alumni")
    application.include_router(upload.router, prefix="/api/upload")
    application.include_router(analytics.router, prefix="/api/analytics")
    application.include_router(linkedin.router, prefix="/api/linkedin")

    @application.get("/", tags=["root"])
    def root():
        return {"message": "Alumni Intelligence Platform API", "version": "1.0.0"}

    @application.get("/health", tags=["health"])
    def health():
        return {"status": "ok"}

    return application


scheduler = CareerUpdateScheduler(db_factory=SessionLocal)
app = create_app()


@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    scheduler.start()


@app.on_event("shutdown")
def shutdown_event():
    scheduler.stop()

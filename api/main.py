import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine
from .routes import stats, drivers, seasons


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="SBR Stats API",
    description="Sim racing league results API",
    version="1.0.0",
    root_path="/sbr-results",
    lifespan=lifespan,
)

# CORS — allow GitHub Pages and local dev
allowed_origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:4173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod via CORS_ORIGINS env var if needed
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(stats.router, prefix="/api")
app.include_router(drivers.router, prefix="/api")
app.include_router(seasons.router, prefix="/api")


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}

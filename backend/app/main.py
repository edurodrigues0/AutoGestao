import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.config import get_cors_origins
from app.lifespan import lifespan
from app.routers import api_router

app = FastAPI(title="AutoGestão API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.agents import router as agents_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="SNS Agent Identity API",
    description="On-chain identity protocol for AI trading agents using .sol domains",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents_router, prefix="/api")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}

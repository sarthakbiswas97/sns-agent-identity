import logging
from dataclasses import asdict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.solana_reader import fetch_agent_profile, fetch_trade_records

logger = logging.getLogger(__name__)
router = APIRouter(tags=["agents"])


class AgentProfileResponse(BaseModel):
    authority: str
    domain_name: str
    domain_key: str
    description: str
    risk_profile: dict
    stats: dict
    reputation_score: int
    win_rate: float
    created_at: int
    last_active: int
    trade_count: int


class TradeRecordResponse(BaseModel):
    agent: str
    index: int
    direction: int
    direction_label: str
    entry_price: int
    exit_price: int
    size_usd: int
    pnl: int
    confidence: int
    timestamp: int


@router.get("/agents/{domain_name}", response_model=AgentProfileResponse)
async def get_agent(domain_name: str) -> AgentProfileResponse:
    domain_name = domain_name.removesuffix(".sol")
    profile = await fetch_agent_profile(domain_name)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Agent '{domain_name}.sol' not found")

    total = profile.stats.total_trades
    win_rate = (profile.stats.wins / total * 100) if total > 0 else 0.0

    return AgentProfileResponse(
        authority=profile.authority,
        domain_name=profile.domain_name,
        domain_key=profile.domain_key,
        description=profile.description,
        risk_profile=asdict(profile.risk_profile),
        stats=asdict(profile.stats),
        reputation_score=profile.reputation_score,
        win_rate=round(win_rate, 2),
        created_at=profile.created_at,
        last_active=profile.last_active,
        trade_count=profile.trade_count,
    )


@router.get(
    "/agents/{domain_name}/trades",
    response_model=list[TradeRecordResponse],
)
async def get_agent_trades(
    domain_name: str, limit: int = 50
) -> list[TradeRecordResponse]:
    domain_name = domain_name.removesuffix(".sol")
    records = await fetch_trade_records(domain_name, limit=limit)
    return [
        TradeRecordResponse(
            agent=r.agent,
            index=r.index,
            direction=r.direction,
            direction_label="LONG" if r.direction == 0 else "SHORT",
            entry_price=r.entry_price,
            exit_price=r.exit_price,
            size_usd=r.size_usd,
            pnl=r.pnl,
            confidence=r.confidence,
            timestamp=r.timestamp,
        )
        for r in records
    ]

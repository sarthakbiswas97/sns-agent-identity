import struct
import logging
from dataclasses import dataclass

import base58
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey

from config import settings

logger = logging.getLogger(__name__)

ANCHOR_DISCRIMINATOR_SIZE = 8


@dataclass(frozen=True)
class RiskProfile:
    max_position_bps: int
    max_daily_loss_bps: int
    max_drawdown_bps: int
    strategy: str


@dataclass(frozen=True)
class TradingStats:
    total_trades: int
    wins: int
    losses: int
    total_pnl: int
    best_trade: int
    worst_trade: int
    total_volume: int


@dataclass(frozen=True)
class AgentProfile:
    authority: str
    domain_name: str
    domain_key: str
    description: str
    risk_profile: RiskProfile
    stats: TradingStats
    reputation_score: int
    created_at: int
    last_active: int
    trade_count: int


@dataclass(frozen=True)
class TradeRecord:
    agent: str
    index: int
    direction: int
    entry_price: int
    exit_price: int
    size_usd: int
    pnl: int
    confidence: int
    timestamp: int


def _read_string(data: bytes, offset: int) -> tuple[str, int]:
    length = struct.unpack_from("<I", data, offset)[0]
    offset += 4
    value = data[offset : offset + length].decode("utf-8")
    return value, offset + length


def _read_pubkey(data: bytes, offset: int) -> tuple[str, int]:
    key_bytes = data[offset : offset + 32]
    return str(Pubkey.from_bytes(key_bytes)), offset + 32


def deserialize_agent_profile(data: bytes) -> AgentProfile:
    offset = ANCHOR_DISCRIMINATOR_SIZE

    authority, offset = _read_pubkey(data, offset)
    domain_name, offset = _read_string(data, offset)
    domain_key, offset = _read_pubkey(data, offset)
    description, offset = _read_string(data, offset)

    max_position_bps = struct.unpack_from("<H", data, offset)[0]
    offset += 2
    max_daily_loss_bps = struct.unpack_from("<H", data, offset)[0]
    offset += 2
    max_drawdown_bps = struct.unpack_from("<H", data, offset)[0]
    offset += 2
    strategy, offset = _read_string(data, offset)

    risk_profile = RiskProfile(
        max_position_bps=max_position_bps,
        max_daily_loss_bps=max_daily_loss_bps,
        max_drawdown_bps=max_drawdown_bps,
        strategy=strategy,
    )

    total_trades = struct.unpack_from("<I", data, offset)[0]
    offset += 4
    wins = struct.unpack_from("<I", data, offset)[0]
    offset += 4
    losses = struct.unpack_from("<I", data, offset)[0]
    offset += 4
    total_pnl = struct.unpack_from("<q", data, offset)[0]
    offset += 8
    best_trade = struct.unpack_from("<q", data, offset)[0]
    offset += 8
    worst_trade = struct.unpack_from("<q", data, offset)[0]
    offset += 8
    total_volume = struct.unpack_from("<Q", data, offset)[0]
    offset += 8

    stats = TradingStats(
        total_trades=total_trades,
        wins=wins,
        losses=losses,
        total_pnl=total_pnl,
        best_trade=best_trade,
        worst_trade=worst_trade,
        total_volume=total_volume,
    )

    reputation_score = struct.unpack_from("<I", data, offset)[0]
    offset += 4
    created_at = struct.unpack_from("<q", data, offset)[0]
    offset += 8
    last_active = struct.unpack_from("<q", data, offset)[0]
    offset += 8
    trade_count = struct.unpack_from("<I", data, offset)[0]

    return AgentProfile(
        authority=authority,
        domain_name=domain_name,
        domain_key=domain_key,
        description=description,
        risk_profile=risk_profile,
        stats=stats,
        reputation_score=reputation_score,
        created_at=created_at,
        last_active=last_active,
        trade_count=trade_count,
    )


def deserialize_trade_record(data: bytes) -> TradeRecord:
    offset = ANCHOR_DISCRIMINATOR_SIZE

    agent, offset = _read_pubkey(data, offset)
    index = struct.unpack_from("<I", data, offset)[0]
    offset += 4
    direction = data[offset]
    offset += 1
    entry_price = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    exit_price = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    size_usd = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    pnl = struct.unpack_from("<q", data, offset)[0]
    offset += 8
    confidence = struct.unpack_from("<H", data, offset)[0]
    offset += 2
    timestamp = struct.unpack_from("<q", data, offset)[0]

    return TradeRecord(
        agent=agent,
        index=index,
        direction=direction,
        entry_price=entry_price,
        exit_price=exit_price,
        size_usd=size_usd,
        pnl=pnl,
        confidence=confidence,
        timestamp=timestamp,
    )


def get_agent_pda(domain_name: str) -> Pubkey:
    program_id = Pubkey.from_string(settings.program_id)
    seeds = [b"agent", domain_name.encode("utf-8")]
    pda, _ = Pubkey.find_program_address(seeds, program_id)
    return pda


def get_trade_pda(agent_key: Pubkey, index: int) -> Pubkey:
    program_id = Pubkey.from_string(settings.program_id)
    seeds = [b"trade", bytes(agent_key), struct.pack("<I", index)]
    pda, _ = Pubkey.find_program_address(seeds, program_id)
    return pda


async def fetch_agent_profile(domain_name: str) -> AgentProfile | None:
    client = AsyncClient(settings.solana_rpc_url)
    try:
        pda = get_agent_pda(domain_name)
        resp = await client.get_account_info(pda)
        if resp.value is None:
            return None
        return deserialize_agent_profile(resp.value.data)
    except Exception:
        logger.exception("Failed to fetch agent profile for %s", domain_name)
        return None
    finally:
        await client.close()


async def fetch_trade_records(
    domain_name: str, limit: int = 50
) -> list[TradeRecord]:
    client = AsyncClient(settings.solana_rpc_url)
    try:
        agent_pda = get_agent_pda(domain_name)
        profile_resp = await client.get_account_info(agent_pda)
        if profile_resp.value is None:
            return []

        profile = deserialize_agent_profile(profile_resp.value.data)
        records: list[TradeRecord] = []
        start = max(0, profile.trade_count - limit)

        for i in range(start, profile.trade_count):
            trade_pda = get_trade_pda(agent_pda, i)
            resp = await client.get_account_info(trade_pda)
            if resp.value is not None:
                records.append(deserialize_trade_record(resp.value.data))

        return records
    except Exception:
        logger.exception("Failed to fetch trade records for %s", domain_name)
        return []
    finally:
        await client.close()

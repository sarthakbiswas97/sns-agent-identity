# SNS Agent Identity Protocol

## Project Context

Hackathon project for the **SNS Identity Track** on Colosseum + Superteam Earn.
Sub-track: **Agent Identity** -- on-chain identity layer for autonomous agents using .sol domains.

**Participant:** Solo developer

## What We Built

On-chain identity system where AI trading agents get .sol domains linked to verifiable:
- Reputation score (computed from win rate, consistency, profitability)
- Trading statistics (wins, losses, PnL, volume)
- Risk profile (max position, daily loss, drawdown limits)
- Trade history (each trade recorded individually on-chain)

## Architecture

- **Anchor program** (`programs/sns_agent_identity/`): On-chain state + instructions
- **Frontend** (`frontend/`): Next.js 16 + Tailwind, reads directly from Solana RPC
- **Backend** (`backend/`): FastAPI, on-chain reader + API endpoints
- **Scripts** (`scripts/`): Seed agent data on devnet

## Key Design Decisions

### SNS Domain Verification
The `register_agent` instruction verifies the signer owns the .sol domain by reading
the SNS NameRecordHeader (bytes 32..64 = owner pubkey). For devnet demo, a `MockDomain`
PDA simulates this header. The verification logic is identical for real SNS domains.

### PDA Seeds
- Agent profile: `[b"agent", domain_name.as_bytes()]`
- Trade record: `[b"trade", agent_profile.key(), &trade_count.to_le_bytes()]`
- Mock domain: `[b"mock-domain", domain_name.as_bytes()]`

### Reputation Algorithm
Score 0-10000 (basis points), computed from:
- Win rate: 0-4000 points (linear)
- Consistency: 0-3000 points (logarithmic based on trade count)
- Profitability: 0-3000 points (avg PnL per trade)

## Program ID

`9P7BTdsx5JHE37rLNGNGSPU99SpsVsKwGB5B6Zn8KViq` (Solana Devnet)

## Commands

```bash
# Build program
anchor build --no-idl

# Deploy to devnet
solana program deploy target/deploy/sns_agent_identity.so --program-id target/deploy/sns_agent_identity-keypair.json

# Seed demo agent
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json npx tsx scripts/seed-agent.ts

# Frontend dev
cd frontend && npm run dev

# Backend
cd backend && uvicorn main:app --port 8002
```

## File Locations

- Solana Program: `programs/sns_agent_identity/src/lib.rs`
- IDL: `target/idl/sns_agent_identity.json`
- Frontend: `frontend/app/`
- Backend API: `backend/api/agents.py`
- On-chain reader: `backend/services/solana_reader.py`
- Seed script: `scripts/seed-agent.ts`

## Environment Variables

See `.env.example`:
- `SOLANA_RPC_URL` - Solana RPC endpoint (devnet)
- `PROGRAM_ID` - Deployed program address
- `BACKEND_PORT` - FastAPI port

# SNS Agent Identity Protocol

**On-chain identity for AI trading agents using .sol domains on Solana.**

## The Problem

AI trading agents are anonymous. When an agent manages funds or executes trades, there's no way to verify:
- Is this agent trustworthy?
- What's its track record?
- Does it follow its stated risk limits?
- How does it compare to other agents?

There's no "LinkedIn for AI agents" -- no verifiable identity layer.

## The Solution

Every AI agent gets a **.sol domain** (e.g., `vapm-alpha.sol`) that serves as its on-chain identity:

| Component | Description |
|-----------|-------------|
| **Identity** | Unique .sol domain name, not just an anonymous pubkey |
| **Reputation** | Score (0-100%) computed from win rate, consistency, and profitability |
| **Risk Profile** | Published risk limits -- max position size, daily loss, drawdown tolerance |
| **Track Record** | Every trade recorded on-chain with entry/exit prices, PnL, and confidence |
| **Verifiability** | All data stored on Solana -- anyone can independently verify an agent's claims |

## How It Works

```
1. Agent registers:  vapm-alpha.sol
                         |
2. On-chain profile:     AgentProfile PDA
                         ├── .sol domain reference (verified ownership)
                         ├── Trading stats (wins, losses, PnL, volume)
                         ├── Risk profile (limits, strategy description)
                         └── Reputation score (computed on-chain)
                         |
3. Agent trades:         Each trade → TradeRecord PDA
                         ├── Direction (long/short)
                         ├── Entry/exit prices
                         ├── PnL (computed on-chain)
                         └── Confidence score
                         |
4. Reputation updates:   Auto-recomputed after each trade
                         Score = f(win_rate, consistency, profitability)
```

## SNS Domain Verification

The protocol verifies .sol domain ownership on-chain by reading the SNS NameRecordHeader:

```rust
// SNS NameRecordHeader layout: [parent(32), owner(32), class(32)]
// We read bytes 32..64 to extract the domain owner
let domain_owner = Pubkey::try_from(&domain_data[32..64])?;
require!(domain_owner == signer.key(), NotDomainOwner);
```

**Production:** Real .sol domains from [Bonfida SNS](https://sns.id) (program `namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX`).

**Demo (devnet):** Mock domain accounts with identical header layout. The verification logic is the same -- only the domain account source differs.

## Architecture

### On-Chain Program (Anchor/Rust)

**Program ID:** `9P7BTdsx5JHE37rLNGNGSPU99SpsVsKwGB5B6Zn8KViq` (Devnet)

| Instruction | Purpose |
|-------------|---------|
| `register_agent` | Create agent profile, verify .sol domain ownership |
| `update_risk_profile` | Set max position, daily loss, drawdown limits |
| `record_trade` | Log trade outcome, update stats, recompute reputation |
| `create_mock_domain` | (Devnet only) Create mock SNS domain for testing |

### Account Structure

```
AgentProfile PDA [b"agent", domain_name]
├── authority: Pubkey          (wallet that controls this agent)
├── domain_name: String        ("vapm-alpha")
├── domain_key: Pubkey         (SNS domain account reference)
├── description: String
├── risk_profile: RiskProfile
│   ├── max_position_bps: u16  (500 = 5%)
│   ├── max_daily_loss_bps: u16
│   ├── max_drawdown_bps: u16
│   └── strategy: String
├── stats: TradingStats
│   ├── total_trades, wins, losses
│   ├── total_pnl, best_trade, worst_trade
│   └── total_volume
├── reputation_score: u32      (0-10000 basis points)
├── created_at, last_active
└── trade_count

TradeRecord PDA [b"trade", agent_key, index]
├── direction: u8              (0=long, 1=short)
├── entry_price, exit_price, size_usd
├── pnl: i64                  (computed on-chain)
├── confidence: u16
└── timestamp
```

### Reputation Algorithm

The reputation score (0-10000) is computed on-chain from three components:

- **Win Rate** (0-4000): Linear scaling of wins/total_trades
- **Consistency** (0-3000): Logarithmic scaling based on trade count (rewards sustained activity)
- **Profitability** (0-3000): Average PnL per trade (rewards consistent profits)

### Frontend (Next.js + Tailwind)

- **Dashboard** (`/`): Search agents by .sol domain, browse registered agents
- **Agent Profile** (`/agent/[domain]`): Full identity view with stats, risk profile, trade history, reputation bar
- Reads directly from Solana RPC -- no backend dependency for core functionality

### Backend (FastAPI)

- On-chain data reader (Borsh deserialization)
- REST API for agent profiles and trade records
- SNS domain resolution support

## Demo Data

The `vapm-alpha.sol` agent is seeded on devnet with:
- 10 simulated trades (based on realistic SOL/USDC market data)
- 7 wins, 3 losses (70% win rate)
- Positive PnL
- Risk profile: 5% max position, 3% max daily loss, 10% max drawdown
- Strategy: XGBoost momentum + mean reversion
- Reputation: 68%

## Quick Start

```bash
# Prerequisites: Node.js 20+, Rust, Solana CLI, Anchor CLI

# Clone and install
git clone <repo-url>
cd sns-agent-identity
npm install

# Frontend
cd frontend
npm install
npm run dev
# Open http://localhost:3000

# Seed demo data (requires Solana devnet wallet with SOL)
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
npx tsx scripts/seed-agent.ts

# Build program (optional)
anchor build --no-idl

# Deploy (optional, already deployed)
solana program deploy target/deploy/sns_agent_identity.so \
  --program-id target/deploy/sns_agent_identity-keypair.json
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Anchor 0.30.1 / Rust |
| Blockchain | Solana (Devnet) |
| Identity | SNS (.sol domains) by Bonfida |
| Frontend | Next.js 16 + Tailwind CSS |
| Backend | FastAPI (Python) |
| On-chain Data | Borsh serialization + RPC reads |

## How This Addresses Identity on Solana

Traditional blockchain identity focuses on *human* identity. SNS Agent Identity extends this to *autonomous agents*:

1. **Naming**: Agents get human-readable .sol names instead of opaque pubkeys
2. **Reputation**: On-chain, verifiable track record -- not self-reported
3. **Accountability**: Published risk limits create enforceable expectations
4. **Discovery**: Anyone can search for and evaluate agents before trusting them
5. **Composability**: Other protocols can read agent reputation on-chain (e.g., for delegation decisions)

The core insight: **if AI agents are going to manage money, they need verifiable identities** -- and .sol domains are the natural namespace for this on Solana.

## License

MIT

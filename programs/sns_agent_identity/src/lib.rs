use anchor_lang::prelude::*;

declare_id!("9P7BTdsx5JHE37rLNGNGSPU99SpsVsKwGB5B6Zn8KViq");

const MAX_DOMAIN_LEN: usize = 32;
const MAX_DESCRIPTION_LEN: usize = 128;
const MAX_STRATEGY_LEN: usize = 64;

// SNS Name Service program (mainnet + devnet)
const SNS_PROGRAM: Pubkey = pubkey!("namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX");

#[program]
pub mod sns_agent_identity {
    use super::*;

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        domain_name: String,
        description: String,
    ) -> Result<()> {
        require!(domain_name.len() <= MAX_DOMAIN_LEN, IdentityError::DomainTooLong);
        require!(description.len() <= MAX_DESCRIPTION_LEN, IdentityError::DescriptionTooLong);

        // Verify the signer owns the SNS domain account.
        // Real SNS NameRecordHeader: [parent(32), owner(32), class(32)] — owner at offset 32
        // Mock domain (our program): [discriminator(8), parent(32), owner(32), class(32)] — owner at offset 40
        let domain_data = ctx.accounts.domain_account.try_borrow_data()?;
        let program_id = crate::id();
        let owner_offset: usize = if ctx.accounts.domain_account.owner == &program_id {
            40 // our mock domain has 8-byte anchor discriminator
        } else {
            32 // real SNS domain
        };
        require!(domain_data.len() >= owner_offset + 32, IdentityError::InvalidDomainAccount);
        let domain_owner = Pubkey::try_from(&domain_data[owner_offset..owner_offset + 32])
            .map_err(|_| IdentityError::InvalidDomainAccount)?;
        require!(
            domain_owner == ctx.accounts.authority.key(),
            IdentityError::NotDomainOwner
        );

        let profile = &mut ctx.accounts.agent_profile;
        profile.authority = ctx.accounts.authority.key();
        profile.domain_name = domain_name;
        profile.domain_key = ctx.accounts.domain_account.key();
        profile.description = description;
        profile.risk_profile = RiskProfile::default();
        profile.stats = TradingStats::default();
        profile.reputation_score = 0;
        profile.created_at = Clock::get()?.unix_timestamp;
        profile.last_active = Clock::get()?.unix_timestamp;
        profile.trade_count = 0;
        profile.bump = ctx.bumps.agent_profile;

        emit!(AgentRegistered {
            authority: profile.authority,
            domain_name: profile.domain_name.clone(),
            domain_key: profile.domain_key,
        });

        Ok(())
    }

    pub fn update_risk_profile(
        ctx: Context<UpdateProfile>,
        max_position_bps: u16,
        max_daily_loss_bps: u16,
        max_drawdown_bps: u16,
        strategy: String,
    ) -> Result<()> {
        require!(max_position_bps <= 10_000, IdentityError::InvalidBps);
        require!(max_daily_loss_bps <= 10_000, IdentityError::InvalidBps);
        require!(max_drawdown_bps <= 10_000, IdentityError::InvalidBps);
        require!(strategy.len() <= MAX_STRATEGY_LEN, IdentityError::StrategyTooLong);

        let profile = &mut ctx.accounts.agent_profile;
        profile.risk_profile = RiskProfile {
            max_position_bps,
            max_daily_loss_bps,
            max_drawdown_bps,
            strategy,
        };
        profile.last_active = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn record_trade(
        ctx: Context<RecordTrade>,
        direction: u8,
        entry_price: u64,
        exit_price: u64,
        size_usd: u64,
        confidence: u16,
    ) -> Result<()> {
        require!(direction <= 1, IdentityError::InvalidDirection);
        require!(confidence <= 10_000, IdentityError::InvalidBps);

        let pnl: i64 = match direction {
            0 => (exit_price as i128 - entry_price as i128)
                .checked_mul(size_usd as i128)
                .ok_or(IdentityError::Overflow)?
                .checked_div(entry_price as i128)
                .ok_or(IdentityError::Overflow)? as i64,
            1 => (entry_price as i128 - exit_price as i128)
                .checked_mul(size_usd as i128)
                .ok_or(IdentityError::Overflow)?
                .checked_div(entry_price as i128)
                .ok_or(IdentityError::Overflow)? as i64,
            _ => return Err(IdentityError::InvalidDirection.into()),
        };

        let record = &mut ctx.accounts.trade_record;
        record.agent = ctx.accounts.agent_profile.key();
        record.index = ctx.accounts.agent_profile.trade_count;
        record.direction = direction;
        record.entry_price = entry_price;
        record.exit_price = exit_price;
        record.size_usd = size_usd;
        record.pnl = pnl;
        record.confidence = confidence;
        record.timestamp = Clock::get()?.unix_timestamp;
        record.bump = ctx.bumps.trade_record;

        let profile = &mut ctx.accounts.agent_profile;
        profile.trade_count += 1;
        profile.stats.total_trades += 1;
        if pnl > 0 {
            profile.stats.wins += 1;
        } else if pnl < 0 {
            profile.stats.losses += 1;
        }
        profile.stats.total_pnl = profile.stats.total_pnl
            .checked_add(pnl)
            .ok_or(IdentityError::Overflow)?;
        if pnl > profile.stats.best_trade {
            profile.stats.best_trade = pnl;
        }
        if pnl < profile.stats.worst_trade {
            profile.stats.worst_trade = pnl;
        }
        profile.stats.total_volume = profile.stats.total_volume
            .checked_add(size_usd)
            .ok_or(IdentityError::Overflow)?;
        profile.last_active = Clock::get()?.unix_timestamp;

        // Recompute reputation inline
        profile.reputation_score = compute_reputation_score(&profile.stats);

        let agent_key = profile.key();
        emit!(TradeRecorded {
            agent: agent_key,
            domain_name: profile.domain_name.clone(),
            direction,
            pnl,
            new_reputation: profile.reputation_score,
        });

        Ok(())
    }

    /// Create a mock SNS domain account for devnet testing.
    /// Simulates the NameRecordHeader layout: [parent(32), owner(32), class(32)].
    /// In production, agents would use real .sol domains from the SNS program.
    pub fn create_mock_domain(
        ctx: Context<CreateMockDomain>,
        _domain_name: String,
    ) -> Result<()> {
        let mock = &mut ctx.accounts.mock_domain;
        // Write authority pubkey at the "owner" offset (bytes 32..64 of NameRecordHeader)
        // Account data layout: [parent(32), owner(32), class(32)]
        // Anchor manages serialization, so we store it as a struct.
        mock.parent = Pubkey::default();
        mock.owner = ctx.accounts.authority.key();
        mock.class = Pubkey::default();
        Ok(())
    }
}

fn compute_reputation_score(stats: &TradingStats) -> u32 {
    if stats.total_trades == 0 {
        return 0;
    }

    // Win rate component (0-4000): win_rate * 4000
    let win_rate_score = (stats.wins as u64)
        .checked_mul(4000)
        .unwrap_or(0)
        .checked_div(stats.total_trades as u64)
        .unwrap_or(0) as u32;

    // Consistency component (0-3000): based on trade count (logarithmic)
    // 1 trade = 0, 10 trades = 1000, 50 trades = 2000, 100+ = 3000
    let consistency_score = match stats.total_trades {
        0..=0 => 0u32,
        1..=9 => (stats.total_trades as u32) * 100,
        10..=49 => 1000 + ((stats.total_trades as u32 - 10) * 25),
        50..=99 => 2000 + ((stats.total_trades as u32 - 50) * 20),
        _ => 3000,
    };

    // Profitability component (0-3000): positive PnL gets up to 3000
    let profit_score = if stats.total_pnl > 0 {
        let pnl_per_trade = (stats.total_pnl as u64)
            .checked_div(stats.total_trades as u64)
            .unwrap_or(0);
        // Scale: $1 avg pnl = 300, $10 = 3000, cap at 3000
        std::cmp::min(pnl_per_trade.checked_mul(300).unwrap_or(3000) as u32, 3000)
    } else {
        0
    };

    std::cmp::min(win_rate_score + consistency_score + profit_score, 10_000)
}

// -- Accounts --

#[derive(Accounts)]
#[instruction(domain_name: String)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = authority,
        space = AgentProfile::size(&domain_name),
        seeds = [b"agent", domain_name.as_bytes()],
        bump
    )]
    pub agent_profile: Account<'info, AgentProfile>,

    /// The SNS domain account. In production, owned by SNS program
    /// (namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX).
    /// For devnet demo, we verify the signer matches the owner field
    /// in the account data (bytes 32..64 of NameRecordHeader).
    /// CHECK: Validated in instruction body by reading owner from data.
    pub domain_account: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateProfile<'info> {
    #[account(
        mut,
        seeds = [b"agent", agent_profile.domain_name.as_bytes()],
        bump = agent_profile.bump,
        has_one = authority
    )]
    pub agent_profile: Account<'info, AgentProfile>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RecordTrade<'info> {
    #[account(
        mut,
        seeds = [b"agent", agent_profile.domain_name.as_bytes()],
        bump = agent_profile.bump,
        has_one = authority
    )]
    pub agent_profile: Account<'info, AgentProfile>,

    #[account(
        init,
        payer = authority,
        space = TradeRecord::SIZE,
        seeds = [
            b"trade",
            agent_profile.key().as_ref(),
            &agent_profile.trade_count.to_le_bytes()
        ],
        bump
    )]
    pub trade_record: Account<'info, TradeRecord>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(domain_name: String)]
pub struct CreateMockDomain<'info> {
    #[account(
        init,
        payer = authority,
        space = MockDomain::SIZE,
        seeds = [b"mock-domain", domain_name.as_bytes()],
        bump
    )]
    pub mock_domain: Account<'info, MockDomain>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// -- State --

#[account]
pub struct MockDomain {
    pub parent: Pubkey,
    pub owner: Pubkey,
    pub class: Pubkey,
}

impl MockDomain {
    pub const SIZE: usize = 8 + 32 + 32 + 32;
}

#[account]
pub struct AgentProfile {
    pub authority: Pubkey,
    pub domain_name: String,
    pub domain_key: Pubkey,
    pub description: String,
    pub risk_profile: RiskProfile,
    pub stats: TradingStats,
    pub reputation_score: u32,
    pub created_at: i64,
    pub last_active: i64,
    pub trade_count: u32,
    pub bump: u8,
}

impl AgentProfile {
    pub fn size(domain_name: &str) -> usize {
        8  // discriminator
        + 32 // authority
        + 4 + domain_name.len() // domain_name (String)
        + 32 // domain_key
        + 4 + MAX_DESCRIPTION_LEN // description (max)
        + RiskProfile::SIZE
        + TradingStats::SIZE
        + 4  // reputation_score
        + 8  // created_at
        + 8  // last_active
        + 4  // trade_count
        + 1  // bump
        + 64 // padding for safety
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct RiskProfile {
    pub max_position_bps: u16,
    pub max_daily_loss_bps: u16,
    pub max_drawdown_bps: u16,
    pub strategy: String,
}

impl RiskProfile {
    pub const SIZE: usize = 2 + 2 + 2 + 4 + MAX_STRATEGY_LEN;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct TradingStats {
    pub total_trades: u32,
    pub wins: u32,
    pub losses: u32,
    pub total_pnl: i64,
    pub best_trade: i64,
    pub worst_trade: i64,
    pub total_volume: u64,
}

impl TradingStats {
    pub const SIZE: usize = 4 + 4 + 4 + 8 + 8 + 8 + 8;
}

#[account]
pub struct TradeRecord {
    pub agent: Pubkey,
    pub index: u32,
    pub direction: u8,
    pub entry_price: u64,
    pub exit_price: u64,
    pub size_usd: u64,
    pub pnl: i64,
    pub confidence: u16,
    pub timestamp: i64,
    pub bump: u8,
}

impl TradeRecord {
    pub const SIZE: usize = 8 + 32 + 4 + 1 + 8 + 8 + 8 + 8 + 2 + 8 + 1 + 16;
}

// -- Events --

#[event]
pub struct AgentRegistered {
    pub authority: Pubkey,
    pub domain_name: String,
    pub domain_key: Pubkey,
}

#[event]
pub struct TradeRecorded {
    pub agent: Pubkey,
    pub domain_name: String,
    pub direction: u8,
    pub pnl: i64,
    pub new_reputation: u32,
}

// -- Errors --

#[error_code]
pub enum IdentityError {
    #[msg("Domain name exceeds 32 characters")]
    DomainTooLong,
    #[msg("Description exceeds 128 characters")]
    DescriptionTooLong,
    #[msg("Strategy description exceeds 64 characters")]
    StrategyTooLong,
    #[msg("Signer does not own the SNS domain")]
    NotDomainOwner,
    #[msg("Invalid domain account data")]
    InvalidDomainAccount,
    #[msg("Basis points must be 0-10000")]
    InvalidBps,
    #[msg("Direction must be 0 (long) or 1 (short)")]
    InvalidDirection,
    #[msg("Arithmetic overflow")]
    Overflow,
}

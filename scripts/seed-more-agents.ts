import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const IDL = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../target/idl/sns_agent_identity.json"),
    "utf-8"
  )
);

const PROGRAM_ID = new PublicKey(
  "9P7BTdsx5JHE37rLNGNGSPU99SpsVsKwGB5B6Zn8KViq"
);

interface AgentConfig {
  name: string;
  description: string;
  riskProfile: { maxPosition: number; maxDailyLoss: number; maxDrawdown: number; strategy: string };
  trades: { direction: number; entry: number; exit: number; size: number; confidence: number }[];
}

const AGENTS: AgentConfig[] = [
  {
    name: "defi-scout",
    description: "Conservative DeFi yield optimizer with strict risk limits",
    riskProfile: { maxPosition: 300, maxDailyLoss: 150, maxDrawdown: 500, strategy: "DeFi yield farming + conservative arbitrage" },
    trades: [
      { direction: 0, entry: 142_200000, exit: 144_800000, size: 200_000000, confidence: 8500 },
      { direction: 0, entry: 144_800000, exit: 147_100000, size: 250_000000, confidence: 8100 },
      { direction: 1, entry: 147_100000, exit: 145_200000, size: 180_000000, confidence: 7900 },
      { direction: 0, entry: 145_200000, exit: 148_600000, size: 220_000000, confidence: 8800 },
      { direction: 0, entry: 148_600000, exit: 150_900000, size: 300_000000, confidence: 9100 },
      { direction: 1, entry: 150_900000, exit: 149_300000, size: 150_000000, confidence: 7200 },
      { direction: 0, entry: 149_300000, exit: 152_400000, size: 270_000000, confidence: 8400 },
      { direction: 0, entry: 152_400000, exit: 151_100000, size: 200_000000, confidence: 6800 },
    ],
  },
  {
    name: "momentum-alpha",
    description: "Aggressive momentum trader targeting high-volatility breakouts",
    riskProfile: { maxPosition: 800, maxDailyLoss: 500, maxDrawdown: 2000, strategy: "Momentum breakout + volatility scalping" },
    trades: [
      { direction: 0, entry: 155_000000, exit: 162_500000, size: 1000_000000, confidence: 9200 },
      { direction: 0, entry: 162_500000, exit: 158_100000, size: 900_000000, confidence: 7800 },
      { direction: 1, entry: 158_100000, exit: 161_400000, size: 800_000000, confidence: 6500 },
      { direction: 0, entry: 161_400000, exit: 167_800000, size: 1200_000000, confidence: 8900 },
      { direction: 1, entry: 167_800000, exit: 163_200000, size: 700_000000, confidence: 7100 },
      { direction: 0, entry: 163_200000, exit: 160_500000, size: 1100_000000, confidence: 6200 },
      { direction: 0, entry: 160_500000, exit: 169_300000, size: 950_000000, confidence: 8600 },
      { direction: 1, entry: 169_300000, exit: 172_100000, size: 600_000000, confidence: 5800 },
      { direction: 0, entry: 172_100000, exit: 168_400000, size: 850_000000, confidence: 7400 },
      { direction: 1, entry: 168_400000, exit: 164_900000, size: 750_000000, confidence: 8100 },
      { direction: 0, entry: 164_900000, exit: 170_200000, size: 1000_000000, confidence: 8300 },
      { direction: 0, entry: 170_200000, exit: 166_800000, size: 900_000000, confidence: 6900 },
      { direction: 1, entry: 166_800000, exit: 170_500000, size: 800_000000, confidence: 5500 },
      { direction: 0, entry: 170_500000, exit: 175_100000, size: 1100_000000, confidence: 9000 },
      { direction: 1, entry: 175_100000, exit: 171_600000, size: 650_000000, confidence: 7600 },
    ],
  },
];

async function seedAgent(program: Program, authority: PublicKey, config: AgentConfig) {
  const { name } = config;

  const [agentProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), Buffer.from(name)],
    PROGRAM_ID
  );
  const [mockDomainPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mock-domain"), Buffer.from(name)],
    PROGRAM_ID
  );

  console.log(`\n--- Seeding ${name}.sol ---`);
  console.log("Agent PDA:", agentProfilePda.toBase58());

  // Create mock domain
  try {
    await (program.methods as any)
      .createMockDomain(name)
      .accounts({
        mockDomain: mockDomainPda,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("  Mock domain created.");
  } catch (e: any) {
    if (e.message?.includes("already in use")) {
      console.log("  Mock domain exists, skipping.");
    } else {
      throw e;
    }
  }

  // Register agent
  try {
    await (program.methods as any)
      .registerAgent(name, config.description)
      .accounts({
        agentProfile: agentProfilePda,
        domainAccount: mockDomainPda,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("  Agent registered.");
  } catch (e: any) {
    if (e.message?.includes("already in use")) {
      console.log("  Agent exists, skipping.");
    } else {
      throw e;
    }
  }

  // Update risk profile
  const rp = config.riskProfile;
  await (program.methods as any)
    .updateRiskProfile(rp.maxPosition, rp.maxDailyLoss, rp.maxDrawdown, rp.strategy)
    .accounts({ agentProfile: agentProfilePda, authority })
    .rpc();
  console.log("  Risk profile set.");

  // Record trades
  console.log(`  Recording ${config.trades.length} trades...`);
  for (let i = 0; i < config.trades.length; i++) {
    const trade = config.trades[i];
    const profile = await (program.account as any).agentProfile.fetch(agentProfilePda);
    const tradeCount = profile.tradeCount;

    const [tradeRecordPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("trade"),
        agentProfilePda.toBuffer(),
        Buffer.from(new Uint8Array(new Uint32Array([tradeCount]).buffer)),
      ],
      PROGRAM_ID
    );

    await (program.methods as any)
      .recordTrade(
        trade.direction,
        new anchor.BN(trade.entry),
        new anchor.BN(trade.exit),
        new anchor.BN(trade.size),
        trade.confidence
      )
      .accounts({
        agentProfile: agentProfilePda,
        tradeRecord: tradeRecordPda,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const dir = trade.direction === 0 ? "LONG" : "SHORT";
    console.log(`    Trade ${i + 1}/${config.trades.length}: ${dir}`);
  }

  // Final state
  const final = await (program.account as any).agentProfile.fetch(agentProfilePda);
  console.log(`  Result: ${final.stats.wins}W/${final.stats.losses}L, reputation=${final.reputationScore}`);
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new Program(IDL as any, provider as any);
  const authority = provider.wallet.publicKey;

  console.log("Authority:", authority.toBase58());
  console.log("Program:", PROGRAM_ID.toBase58());

  for (const agent of AGENTS) {
    await seedAgent(program, authority, agent);
  }

  console.log("\nDone! All agents seeded on devnet.");
}

main().catch(console.error);

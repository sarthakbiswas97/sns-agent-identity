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

const DEMO_TRADES = [
  { direction: 0, entry: 148_500000, exit: 152_300000, size: 500_000000, confidence: 7800 },
  { direction: 1, entry: 152_300000, exit: 149_100000, size: 300_000000, confidence: 6500 },
  { direction: 0, entry: 149_100000, exit: 155_800000, size: 700_000000, confidence: 8200 },
  { direction: 0, entry: 155_800000, exit: 153_200000, size: 400_000000, confidence: 5900 },
  { direction: 1, entry: 153_200000, exit: 148_700000, size: 600_000000, confidence: 7100 },
  { direction: 0, entry: 148_700000, exit: 156_400000, size: 800_000000, confidence: 8500 },
  { direction: 1, entry: 156_400000, exit: 158_100000, size: 350_000000, confidence: 6200 },
  { direction: 0, entry: 158_100000, exit: 162_500000, size: 500_000000, confidence: 7600 },
  { direction: 0, entry: 162_500000, exit: 159_800000, size: 450_000000, confidence: 6800 },
  { direction: 1, entry: 159_800000, exit: 154_300000, size: 550_000000, confidence: 7900 },
];

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new Program(IDL as any, provider as any);
  const authority = provider.wallet.publicKey;
  const domainName = "vapm-alpha";

  console.log("Authority:", authority.toBase58());
  console.log("Program:", PROGRAM_ID.toBase58());

  const [agentProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), Buffer.from(domainName)],
    PROGRAM_ID
  );
  const [mockDomainPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mock-domain"), Buffer.from(domainName)],
    PROGRAM_ID
  );

  console.log("Agent Profile PDA:", agentProfilePda.toBase58());
  console.log("Mock Domain PDA:", mockDomainPda.toBase58());

  // Step 1: Create mock domain
  try {
    console.log("\n1. Creating mock domain...");
    await (program.methods as any)
      .createMockDomain(domainName)
      .accounts({
        mockDomain: mockDomainPda,
        authority: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("   Done.");
  } catch (e: any) {
    if (e.message?.includes("already in use")) {
      console.log("   Already exists, skipping.");
    } else {
      throw e;
    }
  }

  // Step 2: Register agent
  try {
    console.log("\n2. Registering agent:", domainName + ".sol");
    await (program.methods as any)
      .registerAgent(
        domainName,
        "Autonomous SOL/USDC trading agent with XGBoost ML model"
      )
      .accounts({
        agentProfile: agentProfilePda,
        domainAccount: mockDomainPda,
        authority: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("   Done.");
  } catch (e: any) {
    if (e.message?.includes("already in use")) {
      console.log("   Already registered, skipping.");
    } else {
      throw e;
    }
  }

  // Step 3: Update risk profile
  console.log("\n3. Updating risk profile...");
  await (program.methods as any)
    .updateRiskProfile(500, 300, 1000, "XGBoost momentum + mean reversion")
    .accounts({
      agentProfile: agentProfilePda,
      authority: authority,
    })
    .rpc();
  console.log("   Done.");

  // Step 4: Record trades
  console.log("\n4. Recording", DEMO_TRADES.length, "trades...");
  for (let i = 0; i < DEMO_TRADES.length; i++) {
    const trade = DEMO_TRADES[i];

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
        authority: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const dir = trade.direction === 0 ? "LONG" : "SHORT";
    console.log(`   Trade ${i + 1}/${DEMO_TRADES.length}: ${dir}`);
  }

  // Step 5: Read final state
  console.log("\n5. Final profile:");
  const finalProfile = await (program.account as any).agentProfile.fetch(agentProfilePda);
  const stats = finalProfile.stats;
  console.log("   Domain:", finalProfile.domainName + ".sol");
  console.log("   Total trades:", stats.totalTrades);
  console.log("   Wins:", stats.wins, "/ Losses:", stats.losses);
  console.log("   Total PnL:", stats.totalPnl.toString());
  console.log("   Reputation:", finalProfile.reputationScore);
  console.log("   Risk:", JSON.stringify(finalProfile.riskProfile));

  console.log("\nDone! Agent identity seeded on devnet.");
}

main().catch(console.error);

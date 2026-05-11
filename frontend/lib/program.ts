import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import idl from "./idl.json";

export const PROGRAM_ID = new PublicKey(
  "9P7BTdsx5JHE37rLNGNGSPU99SpsVsKwGB5B6Zn8KViq"
);
export const RPC_URL = "https://api.devnet.solana.com";

export interface RiskProfile {
  maxPositionBps: number;
  maxDailyLossBps: number;
  maxDrawdownBps: number;
  strategy: string;
}

export interface TradingStats {
  totalTrades: number;
  wins: number;
  losses: number;
  totalPnl: { toNumber(): number };
  bestTrade: { toNumber(): number };
  worstTrade: { toNumber(): number };
  totalVolume: { toNumber(): number };
}

export interface AgentProfile {
  authority: PublicKey;
  domainName: string;
  domainKey: PublicKey;
  description: string;
  riskProfile: RiskProfile;
  stats: TradingStats;
  reputationScore: number;
  createdAt: { toNumber(): number };
  lastActive: { toNumber(): number };
  tradeCount: number;
  bump: number;
}

export interface TradeRecord {
  agent: PublicKey;
  index: number;
  direction: number;
  entryPrice: { toNumber(): number };
  exitPrice: { toNumber(): number };
  sizeUsd: { toNumber(): number };
  pnl: { toNumber(): number };
  confidence: number;
  timestamp: { toNumber(): number };
  bump: number;
}

function getReadonlyProgram(): Program {
  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new AnchorProvider(
    connection,
    // Read-only dummy wallet
    {
      publicKey: PublicKey.default,
      signAllTransactions: async (txs: any[]) => txs,
      signTransaction: async (tx: any) => tx,
    } as any,
    { commitment: "confirmed" }
  );
  return new Program(idl as any, provider);
}

export function getAgentPda(domainName: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), Buffer.from(domainName)],
    PROGRAM_ID
  );
  return pda;
}

export function getTradePda(
  agentKey: PublicKey,
  index: number
): PublicKey {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(index, 0);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("trade"), agentKey.toBuffer(), buf],
    PROGRAM_ID
  );
  return pda;
}

export async function fetchAgentProfile(
  domainName: string
): Promise<AgentProfile | null> {
  try {
    const program = getReadonlyProgram();
    const pda = getAgentPda(domainName);
    const profile = await (program.account as any).agentProfile.fetch(pda);
    return profile as AgentProfile;
  } catch {
    return null;
  }
}

export async function fetchTradeRecords(
  domainName: string,
  limit = 50
): Promise<TradeRecord[]> {
  try {
    const program = getReadonlyProgram();
    const agentPda = getAgentPda(domainName);
    const profile = await (program.account as any).agentProfile.fetch(
      agentPda
    );
    const count = profile.tradeCount as number;
    const start = Math.max(0, count - limit);
    const records: TradeRecord[] = [];

    for (let i = start; i < count; i++) {
      try {
        const tradePda = getTradePda(agentPda, i);
        const record = await (program.account as any).tradeRecord.fetch(
          tradePda
        );
        records.push(record as TradeRecord);
      } catch {
        continue;
      }
    }
    return records;
  } catch {
    return [];
  }
}

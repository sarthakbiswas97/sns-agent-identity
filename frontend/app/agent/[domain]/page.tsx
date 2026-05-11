"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "../../header";
import {
  fetchAgentProfile,
  fetchTradeRecords,
  getAgentPda,
  type AgentProfile,
  type TradeRecord,
} from "../../../lib/program";

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
      <div className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className={`text-xl font-mono font-bold ${color ?? ""}`}>
        {value}
      </div>
    </div>
  );
}

function ReputationBar({ score }: { score: number }) {
  const pct = score / 100;
  let barColor = "bg-red-500";
  if (pct >= 70) barColor = "bg-emerald-500";
  else if (pct >= 40) barColor = "bg-yellow-500";

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[var(--muted)]">Reputation</span>
        <span className="font-mono font-bold">{pct.toFixed(0)}%</span>
      </div>
      <div className="w-full h-3 bg-[var(--card-border)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function formatPnl(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${(value / 1_000_000).toFixed(2)}`;
}

function formatPrice(value: number): string {
  return `$${(value / 1_000_000).toFixed(2)}`;
}

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AgentProfilePage() {
  const params = useParams();
  const domain = (params?.domain as string)?.replace(/\.sol$/, "") ?? "";

  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!domain) return;
    setLoading(true);
    setError(null);

    Promise.all([fetchAgentProfile(domain), fetchTradeRecords(domain)])
      .then(([p, t]) => {
        if (!p) {
          setError(`Agent "${domain}.sol" not found on-chain`);
        } else {
          setProfile(p);
          setTrades(t);
        }
      })
      .catch(() => setError("Failed to fetch on-chain data"))
      .finally(() => setLoading(false));
  }, [domain]);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-[var(--muted)] font-mono animate-pulse">
          Loading on-chain data...
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="text-red-400 font-mono">{error}</div>
        <Link
          href="/"
          className="text-[var(--accent)] hover:underline text-sm"
        >
          Back to dashboard
        </Link>
      </main>
    );
  }

  const stats = profile.stats;
  const totalTrades = stats.totalTrades;
  const winRate =
    totalTrades > 0 ? ((stats.wins / totalTrades) * 100).toFixed(1) : "0";
  const totalPnl = stats.totalPnl.toNumber();

  return (
    <main className="flex-1">
      <Header />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Agent Identity */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold font-mono mb-1">
            {profile.domainName}
            <span className="text-[var(--accent)]">.sol</span>
          </h2>
          <p className="text-[var(--muted)]">{profile.description}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            <p className="text-xs text-[var(--muted)] font-mono">
              Authority: {profile.authority.toBase58()}
            </p>
            <a
              href={`https://explorer.solana.com/address/${profile.authority.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--accent)] hover:underline"
            >
              View on Explorer
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="text-xs text-[var(--muted)] font-mono">
              Agent PDA: {getAgentPda(profile.domainName).toBase58()}
            </p>
            <a
              href={`https://explorer.solana.com/address/${getAgentPda(profile.domainName).toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--accent)] hover:underline"
            >
              View on Explorer
            </a>
          </div>
          <p className="text-xs text-[var(--muted)] font-mono">
            Registered:{" "}
            {formatTimestamp(profile.createdAt.toNumber())}
          </p>
        </div>

        {/* Reputation */}
        <div className="mb-8">
          <ReputationBar score={profile.reputationScore} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Stat label="Total Trades" value={totalTrades.toString()} />
          <Stat
            label="Win Rate"
            value={`${winRate}%`}
            color={
              Number(winRate) >= 50
                ? "text-emerald-400"
                : "text-red-400"
            }
          />
          <Stat label="Wins / Losses" value={`${stats.wins} / ${stats.losses}`} />
          <Stat
            label="Total PnL"
            value={formatPnl(totalPnl)}
            color={totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}
          />
          <Stat label="Best Trade" value={formatPnl(stats.bestTrade.toNumber())} color="text-emerald-400" />
          <Stat label="Worst Trade" value={formatPnl(stats.worstTrade.toNumber())} color="text-red-400" />
          <Stat label="Total Volume" value={formatPrice(stats.totalVolume.toNumber())} />
          <Stat
            label="Last Active"
            value={formatTimestamp(profile.lastActive.toNumber())}
          />
        </div>

        {/* Risk Profile */}
        <div className="mb-8 p-5 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
          <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">
            Risk Profile
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-[var(--muted)]">Max Position:</span>{" "}
              <span className="font-mono font-bold">
                {(profile.riskProfile.maxPositionBps / 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[var(--muted)]">Max Daily Loss:</span>{" "}
              <span className="font-mono font-bold">
                {(profile.riskProfile.maxDailyLossBps / 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[var(--muted)]">Max Drawdown:</span>{" "}
              <span className="font-mono font-bold">
                {(profile.riskProfile.maxDrawdownBps / 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[var(--muted)]">Strategy:</span>{" "}
              <span className="font-mono">{profile.riskProfile.strategy}</span>
            </div>
          </div>
        </div>

        {/* Trade History */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">
            Trade History
          </h3>
          {trades.length === 0 ? (
            <p className="text-[var(--muted)] text-sm">No trades recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--muted)] text-xs uppercase border-b border-[var(--card-border)]">
                    <th className="text-left py-2 px-3">#</th>
                    <th className="text-left py-2 px-3">Direction</th>
                    <th className="text-right py-2 px-3">Entry</th>
                    <th className="text-right py-2 px-3">Exit</th>
                    <th className="text-right py-2 px-3">Size</th>
                    <th className="text-right py-2 px-3">PnL</th>
                    <th className="text-right py-2 px-3">Confidence</th>
                    <th className="text-right py-2 px-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => {
                    const pnl = trade.pnl.toNumber();
                    return (
                      <tr
                        key={trade.index}
                        className="border-b border-[var(--card-border)] hover:bg-[var(--card-bg)]"
                      >
                        <td className="py-2 px-3 font-mono text-[var(--muted)]">
                          {trade.index}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`font-mono font-bold ${
                              trade.direction === 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {trade.direction === 0 ? "LONG" : "SHORT"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {formatPrice(trade.entryPrice.toNumber())}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {formatPrice(trade.exitPrice.toNumber())}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {formatPrice(trade.sizeUsd.toNumber())}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold ${
                            pnl >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {formatPnl(pnl)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {(trade.confidence / 100).toFixed(0)}%
                        </td>
                        <td className="py-2 px-3 text-right text-[var(--muted)]">
                          {formatTimestamp(trade.timestamp.toNumber())}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

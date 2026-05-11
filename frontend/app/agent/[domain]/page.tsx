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
  let label = "Low";
  let labelColor = "text-red-400";
  if (pct >= 70) {
    barColor = "bg-emerald-500";
    label = "High";
    labelColor = "text-emerald-400";
  } else if (pct >= 40) {
    barColor = "bg-yellow-500";
    label = "Medium";
    labelColor = "text-yellow-400";
  }

  return (
    <div className="p-4 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">
          Reputation Score
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-mono font-bold ${labelColor}`}>
            {pct.toFixed(0)}%
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${labelColor} ${
            pct >= 70 ? "bg-emerald-400/10" : pct >= 40 ? "bg-yellow-400/10" : "bg-red-400/10"
          }`}>
            {label}
          </span>
        </div>
      </div>
      <div className="w-full h-2.5 bg-[var(--card-border)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700`}
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
      <main className="flex-1">
        <Header />
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 bg-[var(--card-border)] rounded" />
            <div className="h-4 w-96 bg-[var(--card-border)] rounded" />
            <div className="h-3 w-full bg-[var(--card-border)] rounded-full" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="p-4 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
                  <div className="h-3 w-16 bg-[var(--card-border)] rounded mb-2" />
                  <div className="h-6 w-20 bg-[var(--card-border)] rounded" />
                </div>
              ))}
            </div>
          </div>
          <p className="text-[var(--muted)] font-mono text-xs text-center pt-8">
            Fetching agent profile from Solana devnet...
          </p>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="flex-1">
        <Header />
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <div className="p-8 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]">
            <div className="text-red-400 font-mono text-lg mb-2">Agent not found</div>
            <p className="text-[var(--muted)] text-sm mb-6">{error}</p>
            <div className="flex justify-center gap-3">
              <Link
                href="/"
                className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-[var(--muted)] text-sm hover:text-[var(--foreground)] hover:border-[var(--accent-dim)] transition-colors"
              >
                Back to dashboard
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-black text-sm font-semibold hover:bg-[var(--accent-dim)] transition-colors"
              >
                Register this agent
              </Link>
            </div>
          </div>
        </div>
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
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <a
              href={`https://explorer.solana.com/address/${profile.authority.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-mono text-[var(--muted)] hover:border-[var(--accent-dim)] hover:text-[var(--accent)] transition-colors"
            >
              <span className="text-[var(--accent)]">Authority</span>
              <span>{profile.authority.toBase58().slice(0, 8)}...</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
            <a
              href={`https://explorer.solana.com/address/${getAgentPda(profile.domainName).toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-mono text-[var(--muted)] hover:border-[var(--accent-dim)] hover:text-[var(--accent)] transition-colors"
            >
              <span className="text-[var(--accent)]">Agent PDA</span>
              <span>{getAgentPda(profile.domainName).toBase58().slice(0, 8)}...</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
            <span className="text-xs text-[var(--muted)] font-mono">
              Registered: {formatTimestamp(profile.createdAt.toNumber())}
            </span>
          </div>
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
            <div className="p-8 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-center">
              <p className="text-[var(--muted)] text-sm mb-1">No trades recorded yet.</p>
              <p className="text-[var(--muted)] text-xs">Trade records will appear here once the agent executes trades on-chain.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--muted)] text-xs uppercase border-b border-[var(--card-border)] bg-[var(--card-bg)]">
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

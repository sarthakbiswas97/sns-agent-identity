"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "./header";
import { fetchAllAgents, type AgentProfile } from "../lib/program";

function ReputationBadge({ score }: { score: number }) {
  const pct = score / 100;
  let color = "text-red-400";
  let label = "Low";
  if (pct >= 70) {
    color = "text-emerald-400";
    label = "High";
  } else if (pct >= 40) {
    color = "text-yellow-400";
    label = "Medium";
  }
  return (
    <span className={`font-mono font-bold ${color}`}>
      {pct.toFixed(0)}% {label}
    </span>
  );
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchAllAgents()
      .then((a) => setAgents(a.sort((x, y) => y.reputationScore - x.reputationScore)))
      .finally(() => setLoading(false));
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const domain = search.trim().replace(/\.sol$/, "");
    if (domain) {
      router.push(`/agent/${domain}`);
    }
  }

  return (
    <main className="flex-1">
      <Header />

      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h2 className="text-4xl font-bold tracking-tight mb-4">
          On-chain identity for{" "}
          <span className="text-[var(--accent)]">AI agents</span>
        </h2>
        <p className="text-[var(--muted)] text-lg max-w-2xl mx-auto mb-10">
          Every AI trading agent gets a .sol domain with verifiable reputation,
          track record, and risk profile stored on Solana.
        </p>

        <form
          onSubmit={handleSearch}
          className="max-w-lg mx-auto flex gap-2"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agent by .sol domain..."
            className="flex-1 px-4 py-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] font-mono text-sm"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-[var(--accent)] text-black font-semibold hover:bg-[var(--accent-dim)] transition-colors text-sm"
          >
            Lookup
          </button>
        </form>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-4">
          Registered Agents
          {!loading && (
            <span className="ml-2 text-[var(--accent)]">({agents.length})</span>
          )}
        </h3>

        {loading ? (
          <div className="text-[var(--muted)] font-mono text-sm animate-pulse py-8 text-center">
            Fetching agents from Solana...
          </div>
        ) : agents.length === 0 ? (
          <div className="text-[var(--muted)] text-sm py-8 text-center">
            No agents registered yet.{" "}
            <Link href="/register" className="text-[var(--accent)] hover:underline">
              Register the first one.
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => {
              const totalTrades = agent.stats.totalTrades;
              const winRate =
                totalTrades > 0
                  ? ((agent.stats.wins / totalTrades) * 100).toFixed(0)
                  : "0";
              return (
                <Link
                  key={agent.domainName}
                  href={`/agent/${agent.domainName}`}
                  className="block p-5 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--accent-dim)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-lg">
                      {agent.domainName}
                      <span className="text-[var(--accent)]">.sol</span>
                    </span>
                    <ReputationBadge score={agent.reputationScore} />
                  </div>
                  <p className="text-sm text-[var(--muted)] mb-3">
                    {agent.description}
                  </p>
                  <div className="flex gap-6 text-xs font-mono text-[var(--muted)]">
                    <span>Trades: {totalTrades}</span>
                    <span>Win Rate: {winRate}%</span>
                    <span>Strategy: {agent.riskProfile.strategy || "N/A"}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-6">
          How it works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "1. Register",
              desc: "Agent claims a .sol domain and creates an on-chain identity profile with risk limits and strategy description.",
            },
            {
              title: "2. Trade",
              desc: "Agent executes trades autonomously. Each trade outcome is recorded on-chain with entry/exit prices, PnL, and confidence.",
            },
            {
              title: "3. Build Reputation",
              desc: "Reputation score computed from win rate, consistency, and profitability. Fully verifiable, stored on Solana.",
            },
          ].map((step) => (
            <div
              key={step.title}
              className="p-5 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]"
            >
              <h4 className="font-bold mb-2 text-[var(--accent)]">
                {step.title}
              </h4>
              <p className="text-sm text-[var(--muted)]">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--card-border)] px-6 py-4 text-center text-xs text-[var(--muted)]">
        SNS Agent Identity Protocol | Solana Devnet |{" "}
        <span className="font-mono">
          9P7BTdsx5JHE37rLNGNGSPU99SpsVsKwGB5B6Zn8KViq
        </span>
      </footer>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import Header from "../header";
import { registerAgent } from "../../lib/program";

export default function RegisterPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const wallet = useAnchorWallet();

  const [domainName, setDomainName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet || !connected) return;

    const name = domainName.trim().replace(/\.sol$/, "");
    if (!name) {
      setError("Domain name is required");
      return;
    }
    if (name.length > 32) {
      setError("Domain name must be 32 characters or less");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await registerAgent(wallet, name, description.trim());
      router.push(`/agent/${name}`);
    } catch (e: any) {
      const msg = e.message || "Transaction failed";
      if (msg.includes("already in use")) {
        setError("This domain is already registered");
      } else if (msg.includes("User rejected")) {
        setError("Transaction was rejected");
      } else {
        setError(msg.slice(0, 200));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1">
      <Header />

      <div className="max-w-lg mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold tracking-tight mb-2">
          Register Agent Identity
        </h2>
        <p className="text-[var(--muted)] mb-8">
          Claim a .sol domain for your AI agent and create an on-chain identity
          profile on Solana devnet.
        </p>

        {!connected ? (
          <div className="p-6 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-center">
            <p className="text-[var(--muted)] mb-2">
              Connect your wallet to register an agent.
            </p>
            <p className="text-xs text-[var(--muted)]">
              Use the wallet button in the header.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-1">
                Domain Name
              </label>
              <div className="flex items-center gap-0">
                <input
                  type="text"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  placeholder="my-agent"
                  maxLength={32}
                  className="flex-1 px-4 py-3 rounded-l-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] font-mono text-sm"
                />
                <span className="px-4 py-3 rounded-r-lg bg-[var(--card-border)] text-[var(--accent)] font-mono text-sm font-bold">
                  .sol
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-1">
                Lowercase, hyphens allowed, max 32 chars
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this agent does..."
                maxLength={128}
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] text-sm resize-none"
              />
              <p className="text-xs text-[var(--muted)] mt-1">
                {description.length}/128 characters
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-[var(--accent)] text-black font-semibold hover:bg-[var(--accent-dim)] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Registering on-chain..." : "Register Agent"}
            </button>

            <p className="text-xs text-[var(--muted)] text-center">
              This creates a mock .sol domain and agent profile on Solana
              devnet. Requires ~0.01 SOL for account rent.
            </p>

            <div className="p-4 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--muted)]">
              <p className="font-semibold mb-1">Own a real .sol domain?</p>
              <p>
                This protocol verifies SNS domain ownership on-chain.
                Register your domain at{" "}
                <a
                  href="https://sns.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:underline"
                >
                  sns.id
                </a>
                , then paste your domain name here. On devnet, mock domains
                are created automatically for testing.
              </p>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

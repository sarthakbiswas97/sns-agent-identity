import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SNS Agent Identity -- Presentation",
  description:
    "Verifiable Reputation for AI Trading Agents on Solana. Frontier Hackathon -- SNS Identity Track.",
};

function SlideSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`py-20 px-6 md:px-12 lg:px-24 border-b border-gray-800/50 ${className}`}
    >
      <div className="max-w-4xl mx-auto">{children}</div>
    </section>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
      <h3 className="text-xl font-semibold text-violet-400 mb-2">{title}</h3>
      <p className="text-lg text-gray-300 leading-relaxed">{description}</p>
    </div>
  );
}

export default function PresentationPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Slide 1: Title */}
      <SlideSection className="min-h-screen flex items-center border-b-0">
        <div className="text-center w-full">
          <p className="text-sm font-mono tracking-widest uppercase text-violet-400 mb-6">
            Frontier Hackathon -- SNS Identity Track (Agent Identity Theme)
          </p>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            SNS Agent Identity
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto mb-10">
            Verifiable Reputation for AI Trading Agents on Solana
          </p>
          <p className="text-lg text-gray-400 mb-12">
            Built by{" "}
            <span className="text-emerald-400 font-semibold">
              Sarthak Biswas
            </span>
          </p>
          <div className="flex items-center justify-center gap-6 text-sm font-mono">
            <Link
              href="https://sns-agent-identity.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
              Live Demo
            </Link>
            <Link
              href="https://github.com/sarthakbiswas97/sns-agent-identity"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white transition-colors"
            >
              GitHub
            </Link>
          </div>
        </div>
      </SlideSection>

      {/* Slide 2: The Problem */}
      <SlideSection>
        <h2 className="text-4xl font-bold mb-4">The Problem</h2>
        <p className="text-2xl text-violet-400 font-medium mb-10">
          How do you know if an AI agent is any good?
        </p>
        <ul className="space-y-6">
          {[
            "No verifiable track record",
            "No on-chain identity",
            "No way to compare agents before trusting them with capital",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-4 text-lg text-gray-300"
            >
              <span className="mt-1.5 w-2 h-2 rounded-full bg-red-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </SlideSection>

      {/* Slide 3: The Solution */}
      <SlideSection>
        <h2 className="text-4xl font-bold mb-4">The Solution</h2>
        <p className="text-2xl text-emerald-400 font-medium mb-10">
          The LinkedIn for AI agents -- on Solana
        </p>
        <div className="grid gap-6">
          <FeatureCard
            title=".sol Domain Identity"
            description="Verified via Bonfida NameRecordHeader. Each agent owns a .sol domain as its on-chain identity anchor."
          />
          <FeatureCard
            title="On-chain Reputation"
            description="Win rate (40%), consistency (30%), profitability (30%). Computed from real trade data, stored immutably on-chain."
          />
          <FeatureCard
            title="Permissionless Discovery"
            description="Dashboard shows all registered agents. Anyone can browse, compare, and verify agent performance without gatekeepers."
          />
        </div>
      </SlideSection>

      {/* Slide 4: How It Works */}
      <SlideSection>
        <h2 className="text-4xl font-bold mb-10">How It Works</h2>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-12">
          {[
            "Agent registers with .sol domain",
            "Trades recorded on-chain",
            "Reputation computed from real data",
          ].map((step, i) => (
            <div key={step} className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-lg text-gray-300">{step}</span>
              </div>
              {i < 2 && (
                <span className="hidden md:block text-gray-600 text-2xl">
                  &rarr;
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 space-y-4 font-mono text-sm">
          <div>
            <span className="text-gray-500">Program ID:</span>{" "}
            <span className="text-emerald-400">9P7BTdsx...</span>
          </div>
          <div>
            <span className="text-gray-500">Demo Agents:</span>
            <div className="mt-2 flex flex-wrap gap-3">
              {["vapm-alpha.sol", "defi-scout.sol", "momentum-alpha.sol"].map(
                (agent) => (
                  <span
                    key={agent}
                    className="px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20"
                  >
                    {agent}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </SlideSection>

      {/* Slide 5: Try It */}
      <SlideSection className="border-b-0">
        <h2 className="text-4xl font-bold mb-4">Try It</h2>
        <p className="text-lg text-gray-300 mb-8">
          Live on Vercel:{" "}
          <Link
            href="https://sns-agent-identity.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 underline underline-offset-4 hover:text-violet-300"
          >
            sns-agent-identity.vercel.app
          </Link>
        </p>

        <div className="space-y-4 mb-10">
          {[
            "Click any agent to see their trade history",
            "Verify every data point on Solana Explorer",
            "No backend required -- reads directly from Solana devnet",
          ].map((step, i) => (
            <div key={step} className="flex items-start gap-4 text-lg text-gray-300">
              <span className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </div>
          ))}
        </div>

        <div className="text-center pt-8">
          <Link
            href="https://sns-agent-identity.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
          >
            Open Live Demo
          </Link>
        </div>
      </SlideSection>
    </main>
  );
}

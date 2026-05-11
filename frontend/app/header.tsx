"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isRegister = pathname === "/register";

  return (
    <header className="border-b border-[var(--card-border)] px-6 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold tracking-tight hover:opacity-80">
            <span className="text-[var(--accent)]">SNS</span> Agent Identity
          </Link>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                isHome
                  ? "text-[var(--foreground)] bg-[var(--card-bg)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/register"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                isRegister
                  ? "text-[var(--foreground)] bg-[var(--card-bg)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Register
            </Link>
            <Link
              href="/presentation"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                pathname === "/presentation"
                  ? "text-[var(--foreground)] bg-[var(--card-bg)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Pitch
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/register"
            className="hidden sm:inline-flex px-4 py-2 rounded-lg border border-[var(--accent)] text-[var(--accent)] text-sm font-semibold hover:bg-[var(--accent)] hover:text-black transition-colors"
          >
            Register Agent
          </Link>
          <WalletMultiButton
            style={{
              backgroundColor: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              height: "2.5rem",
            }}
          />
        </div>
      </div>
    </header>
  );
}

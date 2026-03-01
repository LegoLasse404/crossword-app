"use client";

import Link from "next/link";
import { useUser } from "@/hooks/use-user";

export function Header() {
  const user = useUser();

  return (
    <header className="classic-header border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <Link
          href="/"
          className="classic-title text-3xl font-bold mb-6 hover:opacity-80 transition-opacity inline-block"
        >
          Crossword App
        </Link>

        <nav className="flex gap-8 items-center">
          <Link
            href="/account"
            className="classic-link font-medium transition-colors"
          >
            Account
          </Link>
          <Link
            href="/friends"
            className="classic-link font-medium transition-colors"
          >
            Friends
          </Link>
          <Link
            href="/crosswords"
            className="classic-link font-medium transition-colors"
          >
            Crosswords
          </Link>
          {user ? (
            <span className="classic-text text-sm">
              {user.email}
            </span>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

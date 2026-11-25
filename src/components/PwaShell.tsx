"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Calendar,
  CloudLightning,
  FileText,
  Mic,
  RefreshCw,
} from "lucide-react";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { getFirebaseClient, isFirebaseConfigured } from "@/lib/firebase/client";
import { syncWithFirestore } from "@/db/sync";

export function PwaShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const { auth } = getFirebaseClient();
    if (!auth) return;

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await syncWithFirestore(u.uid);
      }
    });
    return () => unsub();
  }, []);

  async function handleSyncClick() {
    const { auth, googleProvider } = getFirebaseClient();
    if (!isFirebaseConfigured || !auth) {
      setSyncMsg("Local-only mode (add Firebase keys in .env.local to sync)");
      setTimeout(() => setSyncMsg(null), 3500);
      return;
    }

    if (!user) {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch {
        setSyncMsg("Sign-in cancelled");
        setTimeout(() => setSyncMsg(null), 2500);
      }
      return;
    }

    setSyncing(true);
    const res = await syncWithFirestore(user.uid);
    setSyncing(false);
    setSyncMsg(
      res.error
        ? res.error
        : `Synced: ↑${res.pushed} pushed, ↓${res.pulled} pulled`
    );
    setTimeout(() => setSyncMsg(null), 3000);
  }

  const navItems = [
    { href: "/log", label: "Log", icon: Mic },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/insights", label: "Triggers", icon: Activity },
    { href: "/report", label: "Doctor PDF", icon: FileText },
  ];

  if (pathname === "/") {
    return <div className="min-h-screen bg-black text-[#e7d8c9]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-black text-[#e7d8c9] flex flex-col pb-20">
      {/* Minimal Blackout Header */}
      <header className="sticky top-0 z-30 bg-black/95 border-b border-[#261e1a] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudLightning className="w-4 h-4 text-[#d97706]" />
          <span className="text-sm font-semibold tracking-wide text-[#d4a373]">
            NeuroCalm
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#14110f] border border-[#261e1a] text-[#78716c]">
            BLACKOUT
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncClick}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[#0a0a0a] border border-[#261e1a] text-[#d4a373] hover:border-[#d97706]/50 transition"
            title="Sync with Firebase Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>
              {user ? "Sync" : isFirebaseConfigured ? "Sign In" : "Offline"}
            </span>
          </button>
          {user && (
            <button
              onClick={() => {
                const { auth } = getFirebaseClient();
                if (auth) signOut(auth);
              }}
              className="text-[11px] text-[#78716c] hover:text-[#d4a373]"
            >
              Out
            </button>
          )}
        </div>
      </header>

      {syncMsg && (
        <div className="bg-[#14110f] border-b border-[#261e1a] px-4 py-1.5 text-xs text-center text-[#d97706]">
          {syncMsg}
        </div>
      )}

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-4">
        {children}
      </main>

      {/* Photophobia-Safe Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-black/95 border-t border-[#261e1a]">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2.5 text-[11px] transition ${
                  active
                    ? "text-[#d97706] font-medium"
                    : "text-[#78716c] hover:text-[#d4a373]"
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

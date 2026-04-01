"use client";

import { useState } from "react";
import Link from "next/link";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useBackupReminder } from "@/hooks/useBackupReminder";
import { useSettings } from "@/hooks/useSettings";

interface AppShellProps {
  children: React.ReactNode;
  showBack?: boolean;
  title?: string;
}

export default function AppShell({ children, showBack = false, title }: AppShellProps) {
  const isOnline = useOnlineStatus();
  const settings = useSettings();
  const needsBackup = useBackupReminder(settings);
  const [backupDismissed, setBackupDismissed] = useState(false);

  const showBackupBanner = needsBackup && !backupDismissed;

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-14 pb-3 bg-black/95 backdrop-blur-sm sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-3">
          {showBack && (
            <Link
              href="/"
              className="flex items-center gap-1 text-blue-400 active:opacity-60 transition-opacity"
            >
              <svg
                width="10"
                height="17"
                viewBox="0 0 10 17"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M8.5 1.5L1.5 8.5L8.5 15.5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[17px] font-normal">Back</span>
            </Link>
          )}
          {title && (
            <h1 className="text-[17px] font-semibold text-white tracking-tight">
              {title}
            </h1>
          )}
        </div>

        {/* Online/offline dot */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium ${isOnline ? "text-emerald-400" : "text-amber-400"}`}
          >
            {isOnline ? "" : "Offline"}
          </span>
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isOnline
                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
            }`}
            title={isOnline ? "Online" : "Offline"}
          />
        </div>
      </header>

      {/* Backup reminder banner */}
      {showBackupBanner && (
        <div className="mx-4 mt-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-amber-400 text-lg" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2L18 17H2L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
                <path d="M10 8V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="10" cy="14" r="0.75" fill="currentColor"/>
              </svg>
            </span>
            <p className="text-amber-200 text-sm font-medium leading-snug">
              Time to back up your data
            </p>
          </div>
          <button
            onClick={() => setBackupDismissed(true)}
            className="text-amber-400/70 hover:text-amber-400 active:opacity-60 transition-colors p-1 -mr-1"
            aria-label="Dismiss backup reminder"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}

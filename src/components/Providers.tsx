"use client";

import { useEffect } from "react";
import { seedDatabase } from "@/lib/seed-data";
import { useCalendarSync } from "@/hooks/useCalendarSync";
import { syncWithCloud } from "@/lib/sync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function Providers({ children }: { children: React.ReactNode }) {
  useCalendarSync();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    seedDatabase().then(() => {
      syncWithCloud();
    });
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncWithCloud();
    }
  }, [isOnline]);

  return <>{children}</>;
}

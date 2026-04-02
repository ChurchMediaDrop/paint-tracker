"use client";

import { useEffect } from "react";
import { seedDatabase } from "@/lib/seed-data";
import { useCalendarSync } from "@/hooks/useCalendarSync";
import { syncWithCloud } from "@/lib/sync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { initGoogleCalendar } from "@/lib/google-calendar";

export function Providers({ children }: { children: React.ReactNode }) {
  useCalendarSync();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    seedDatabase().then(() => {
      syncWithCloud();
    });
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (clientId) {
      initGoogleCalendar(clientId).catch((err) =>
        console.warn("Google Calendar init failed:", err)
      );
    }
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncWithCloud();
    }
  }, [isOnline]);

  return <>{children}</>;
}

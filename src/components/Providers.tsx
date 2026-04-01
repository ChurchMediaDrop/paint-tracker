"use client";

import { useEffect } from "react";
import { seedDatabase } from "@/lib/seed-data";
import { useCalendarSync } from "@/hooks/useCalendarSync";

export function Providers({ children }: { children: React.ReactNode }) {
  useCalendarSync();

  useEffect(() => {
    seedDatabase();
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  return <>{children}</>;
}

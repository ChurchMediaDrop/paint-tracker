import { useMemo } from "react";
import type { AppSettings } from "@/lib/types";

export function useBackupReminder(settings: AppSettings | undefined): boolean {
  return useMemo(() => {
    if (!settings) return false;
    if (!settings.lastBackupDate) return true;

    const lastBackup = new Date(settings.lastBackupDate);
    const now = new Date();
    const daysSince = Math.floor(
      (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSince >= settings.backupReminderDays;
  }, [settings]);
}

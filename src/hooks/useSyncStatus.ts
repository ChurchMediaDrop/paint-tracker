import { useState, useEffect } from "react";
import { subscribeSyncStatus } from "@/lib/sync";

interface SyncStatus {
  syncing: boolean;
  lastSynced: Date | null;
  error: string | null;
}

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    syncing: false,
    lastSynced: null,
    error: null,
  });

  useEffect(() => {
    return subscribeSyncStatus(setStatus);
  }, []);

  return status;
}

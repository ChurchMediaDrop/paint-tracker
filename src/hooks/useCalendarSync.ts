import { useEffect, useRef } from "react";
import { db } from "@/lib/db";
import { CalendarOperation } from "@/lib/types";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function useCalendarSync() {
  const isOnline = useOnlineStatus();
  const processing = useRef(false);

  useEffect(() => {
    if (!isOnline || processing.current) return;

    async function processQueue() {
      processing.current = true;
      try {
        const settings = await db.appSettings.get("default");
        if (!settings?.googleCalendarConnected) return;

        const pending = await db.calendarSyncQueue.orderBy("createdAt").toArray();
        for (const item of pending) {
          try {
            const payload = item.payload as any;
            switch (item.operation) {
              case CalendarOperation.Create: {
                const eventId = await createCalendarEvent(payload);
                await db.jobs.update(item.jobId, { googleCalendarEventId: eventId });
                break;
              }
              case CalendarOperation.Update:
                if (payload.eventId) await updateCalendarEvent(payload.eventId, payload);
                break;
              case CalendarOperation.Delete:
                if (payload.eventId) await deleteCalendarEvent(payload.eventId);
                break;
            }
            await db.calendarSyncQueue.delete(item.id);
          } catch (error) {
            console.error("Calendar sync failed for item:", item.id, error);
            break;
          }
        }
      } finally {
        processing.current = false;
      }
    }
    processQueue();
  }, [isOnline]);
}

export async function queueCalendarEvent(
  jobId: string, operation: CalendarOperation, payload: Record<string, unknown>
): Promise<void> {
  await db.calendarSyncQueue.add({
    id: crypto.randomUUID(), jobId, operation, payload, createdAt: new Date().toISOString(),
  });
}

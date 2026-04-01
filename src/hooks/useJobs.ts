import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import type { Job } from "@/lib/types";
import { JobStatus, CalendarOperation } from "@/lib/types";
import { queueCalendarEvent } from "@/hooks/useCalendarSync";

export function useJobs(filters?: { customerId?: string; status?: JobStatus }) {
  const jobs = useLiveQuery(async () => {
    let results = await db.jobs.orderBy("scheduledDate").reverse().toArray();
    if (filters?.customerId) {
      results = results.filter((j) => j.customerId === filters.customerId);
    }
    if (filters?.status) {
      results = results.filter((j) => j.status === filters.status);
    }
    return results;
  }, [filters?.customerId, filters?.status]);

  return jobs ?? [];
}

export function useJob(id: string) {
  return useLiveQuery(() => db.jobs.get(id), [id]);
}

export function useJobsByDateRange(startDate: string, endDate: string) {
  const jobs = useLiveQuery(async () => {
    return db.jobs
      .where("scheduledDate")
      .between(startDate, endDate, true, true)
      .toArray();
  }, [startDate, endDate]);

  return jobs ?? [];
}

export async function createJob(
  data: Omit<Job, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = new Date().toISOString();
  const id = uuid();
  await db.jobs.add({ ...data, id, createdAt: now, updatedAt: now });

  const settings = await db.appSettings.get("default");
  if (settings?.googleCalendarConnected) {
    await queueCalendarEvent(id, CalendarOperation.Create, {
      jobId: id,
      title: data.serviceType,
      description: data.notes,
      startTime: data.scheduledDate,
      endTime: data.scheduledDate,
      location: data.address,
    });
  }

  return id;
}

export async function updateJob(
  id: string,
  data: Partial<Job>
): Promise<void> {
  const existing = await db.jobs.get(id);
  await db.jobs.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });

  if (existing && data.scheduledDate !== undefined && data.scheduledDate !== existing.scheduledDate) {
    const settings = await db.appSettings.get("default");
    if (settings?.googleCalendarConnected) {
      const updated = { ...existing, ...data };
      await queueCalendarEvent(id, CalendarOperation.Update, {
        eventId: existing.googleCalendarEventId,
        title: updated.serviceType,
        description: updated.notes,
        startTime: updated.scheduledDate,
        endTime: updated.scheduledDate,
        location: updated.address,
      });
    }
  }
}

export async function deleteJob(id: string): Promise<void> {
  const job = await db.jobs.get(id);

  const quote = await db.quotes.where("jobId").equals(id).first();
  if (quote) {
    await db.rooms.where("quoteId").equals(quote.id).delete();
    await db.quotes.delete(quote.id);
  }
  await db.actuals.where("jobId").equals(id).delete();
  await db.jobs.delete(id);

  if (job?.googleCalendarEventId) {
    const settings = await db.appSettings.get("default");
    if (settings?.googleCalendarConnected) {
      await queueCalendarEvent(id, CalendarOperation.Delete, {
        eventId: job.googleCalendarEventId,
      });
    }
  }
}

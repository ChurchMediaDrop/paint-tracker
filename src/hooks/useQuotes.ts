import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import type { Quote, Room } from "@/lib/types";
import { scheduleSyncDebounced } from "@/lib/sync";

export function useQuote(jobId: string) {
  return useLiveQuery(
    () => db.quotes.where("jobId").equals(jobId).first(),
    [jobId]
  );
}

export function useQuoteById(id: string) {
  return useLiveQuery(() => db.quotes.get(id), [id]);
}

export function useRooms(quoteId: string) {
  const rooms = useLiveQuery(
    () => db.rooms.where("quoteId").equals(quoteId).sortBy("sortOrder"),
    [quoteId]
  );
  return rooms ?? [];
}

export async function createQuote(
  data: Omit<Quote, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = new Date().toISOString();
  const id = uuid();
  await db.quotes.add({ ...data, id, createdAt: now, updatedAt: now });
  scheduleSyncDebounced();
  return id;
}

export async function updateQuote(
  id: string,
  data: Partial<Quote>
): Promise<void> {
  await db.quotes.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
  scheduleSyncDebounced();
}

export async function addRoom(
  data: Omit<Room, "id" | "updatedAt">
): Promise<string> {
  const id = uuid();
  await db.rooms.add({ ...data, id, updatedAt: new Date().toISOString() });
  scheduleSyncDebounced();
  return id;
}

export async function updateRoom(
  id: string,
  data: Partial<Room>
): Promise<void> {
  await db.rooms.update(id, { ...data, updatedAt: new Date().toISOString() });
  scheduleSyncDebounced();
}

export async function deleteRoom(id: string): Promise<void> {
  await db.rooms.delete(id);
  scheduleSyncDebounced();
}

export async function recalculateQuoteTotals(quoteId: string): Promise<void> {
  const rooms = await db.rooms.where("quoteId").equals(quoteId).toArray();
  const quote = await db.quotes.get(quoteId);
  if (!quote) return;

  const totalMaterials = rooms.reduce(
    (sum, r) => sum + (r.materialCost || r.manualCost || 0),
    0
  );
  const totalLaborHours = rooms.reduce(
    (sum, r) => sum + (r.estimatedLaborHours || r.manualHours || 0),
    0
  );
  const totalLabor = totalLaborHours * quote.laborRate;
  const subtotal = totalMaterials + totalLabor;
  const totalPrice = subtotal * (1 + quote.markupPercent / 100);

  await updateQuote(quoteId, { totalMaterials, totalLabor, totalPrice });
  scheduleSyncDebounced();
}

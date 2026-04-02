import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { AppSettings, PaintPreset, MessageTemplate } from "@/lib/types";
import { scheduleSyncDebounced } from "@/lib/sync";

export function useSettings() {
  return useLiveQuery(() => db.appSettings.get("default"));
}

export async function updateSettings(
  data: Partial<AppSettings>
): Promise<void> {
  await db.appSettings.update("default", data);
  scheduleSyncDebounced();
}

export function usePaintPresets() {
  const presets = useLiveQuery(() => db.paintPresets.toArray());
  return presets ?? [];
}

export async function updatePaintPreset(
  id: string,
  data: Partial<PaintPreset>
): Promise<void> {
  await db.paintPresets.update(id, { ...data, updatedAt: new Date().toISOString() });
  scheduleSyncDebounced();
}

export function useMessageTemplates() {
  const templates = useLiveQuery(() => db.messageTemplates.toArray());
  return templates ?? [];
}

export async function updateMessageTemplate(
  id: string,
  data: Partial<MessageTemplate>
): Promise<void> {
  await db.messageTemplates.update(id, { ...data, updatedAt: new Date().toISOString() });
  scheduleSyncDebounced();
}

export async function createMessageTemplate(
  data: Omit<MessageTemplate, "id" | "updatedAt">
): Promise<string> {
  const id = crypto.randomUUID();
  await db.messageTemplates.add({ ...data, id, updatedAt: new Date().toISOString() });
  scheduleSyncDebounced();
  return id;
}

export async function deleteMessageTemplate(id: string): Promise<void> {
  await db.messageTemplates.delete(id);
  scheduleSyncDebounced();
}

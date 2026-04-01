import { db } from "@/lib/db";

const CURRENT_VERSION = 1;

interface BackupData {
  version: number;
  exportedAt: string;
  customers: unknown[];
  jobs: unknown[];
  quotes: unknown[];
  rooms: unknown[];
  actuals: unknown[];
  messageTemplates: unknown[];
  paintPresets: unknown[];
  appSettings: unknown[];
}

export async function exportDatabase(): Promise<string> {
  const data: BackupData = {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    customers: await db.customers.toArray(),
    jobs: await db.jobs.toArray(),
    quotes: await db.quotes.toArray(),
    rooms: await db.rooms.toArray(),
    actuals: await db.actuals.toArray(),
    messageTemplates: await db.messageTemplates.toArray(),
    paintPresets: await db.paintPresets.toArray(),
    appSettings: await db.appSettings.toArray(),
  };
  return JSON.stringify(data, null, 2);
}

export async function importDatabase(jsonString: string): Promise<void> {
  let data: BackupData;
  try { data = JSON.parse(jsonString); } catch { throw new Error("Invalid JSON in backup file"); }
  if (!data.version) throw new Error("Invalid backup file: missing version");

  await db.customers.clear();
  await db.jobs.clear();
  await db.quotes.clear();
  await db.rooms.clear();
  await db.actuals.clear();
  await db.messageTemplates.clear();
  await db.paintPresets.clear();
  await db.appSettings.clear();

  if (data.customers?.length) await db.customers.bulkAdd(data.customers as never[]);
  if (data.jobs?.length) await db.jobs.bulkAdd(data.jobs as never[]);
  if (data.quotes?.length) await db.quotes.bulkAdd(data.quotes as never[]);
  if (data.rooms?.length) await db.rooms.bulkAdd(data.rooms as never[]);
  if (data.actuals?.length) await db.actuals.bulkAdd(data.actuals as never[]);
  if (data.messageTemplates?.length) await db.messageTemplates.bulkAdd(data.messageTemplates as never[]);
  if (data.paintPresets?.length) await db.paintPresets.bulkAdd(data.paintPresets as never[]);
  if (data.appSettings?.length) await db.appSettings.bulkAdd(data.appSettings as never[]);
}

export function downloadJson(jsonString: string, filename: string): void {
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

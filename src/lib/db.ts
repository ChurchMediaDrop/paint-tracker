import Dexie, { type EntityTable } from "dexie";
import type {
  Customer,
  Job,
  Quote,
  Room,
  Actuals,
  MessageTemplate,
  PaintPreset,
  CalendarSyncQueue,
  AppSettings,
} from "@/lib/types";

export class PaintTrackerDB extends Dexie {
  customers!: EntityTable<Customer, "id">;
  jobs!: EntityTable<Job, "id">;
  quotes!: EntityTable<Quote, "id">;
  rooms!: EntityTable<Room, "id">;
  actuals!: EntityTable<Actuals, "id">;
  messageTemplates!: EntityTable<MessageTemplate, "id">;
  paintPresets!: EntityTable<PaintPreset, "id">;
  calendarSyncQueue!: EntityTable<CalendarSyncQueue, "id">;
  appSettings!: EntityTable<AppSettings, "id">;

  constructor() {
    super("PaintTrackerDB");
    this.version(1).stores({
      customers: "id, name, updatedAt",
      jobs: "id, customerId, status, scheduledDate, updatedAt",
      quotes: "id, jobId",
      rooms: "id, quoteId, sortOrder",
      actuals: "id, jobId",
      messageTemplates: "id, isDefault",
      paintPresets: "id, surfaceType, isDefault",
      calendarSyncQueue: "id, createdAt",
      appSettings: "id",
    });
  }
}

export const db = new PaintTrackerDB();

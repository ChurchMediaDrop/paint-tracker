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
    this.version(2).stores({
      customers: "id, name, updatedAt",
      jobs: "id, customerId, status, scheduledDate, updatedAt",
      quotes: "id, jobId, updatedAt",
      rooms: "id, quoteId, sortOrder, updatedAt",
      actuals: "id, jobId, updatedAt",
      messageTemplates: "id, isDefault, updatedAt",
      paintPresets: "id, surfaceType, isDefault, updatedAt",
      calendarSyncQueue: "id, createdAt",
      appSettings: "id",
    }).upgrade(tx => {
      const now = new Date().toISOString();
      return Promise.all([
        tx.table("rooms").toCollection().modify(record => {
          if (!record.updatedAt) record.updatedAt = now;
        }),
        tx.table("actuals").toCollection().modify(record => {
          if (!record.updatedAt) record.updatedAt = now;
        }),
        tx.table("messageTemplates").toCollection().modify(record => {
          if (!record.updatedAt) record.updatedAt = now;
        }),
        tx.table("paintPresets").toCollection().modify(record => {
          if (!record.updatedAt) record.updatedAt = now;
        }),
        tx.table("quotes").toCollection().modify(record => {
          if (!record.updatedAt) record.updatedAt = now;
        }),
      ]);
    });
    this.version(3).stores({
      customers: "id, name, updatedAt",
      jobs: "id, customerId, status, scheduledDate, updatedAt",
      quotes: "id, jobId, updatedAt",
      rooms: "id, quoteId, sortOrder, updatedAt",
      actuals: "id, jobId, updatedAt",
      messageTemplates: "id, isDefault, updatedAt",
      paintPresets: "id, surfaceType, isDefault, updatedAt",
      calendarSyncQueue: "id, createdAt",
      appSettings: "id",
    }).upgrade(tx => {
      return tx.table("rooms").toCollection().modify(record => {
        if (record.includeTrim === undefined) record.includeTrim = false;
        if (record.includeDoors === undefined) record.includeDoors = false;
        if (record.ceilingColor === undefined) record.ceilingColor = "";
        if (record.ceilingBrand === undefined) record.ceilingBrand = "";
        if (record.ceilingFinish === undefined) record.ceilingFinish = null;
        if (record.ceilingPricePerGallon === undefined) record.ceilingPricePerGallon = null;
        if (record.trimColor === undefined) record.trimColor = "";
        if (record.trimBrand === undefined) record.trimBrand = "";
        if (record.trimFinish === undefined) record.trimFinish = null;
        if (record.trimPricePerGallon === undefined) record.trimPricePerGallon = null;
        if (record.ceilingGallonsNeeded === undefined) record.ceilingGallonsNeeded = 0;
        if (record.trimGallonsNeeded === undefined) record.trimGallonsNeeded = 0;
      });
    });
  }
}

export const db = new PaintTrackerDB();

import { describe, it, expect, beforeEach } from "vitest";
import Dexie from "dexie";
import { db, PaintTrackerDB } from "@/lib/db";
import { seedDatabase, resetSeedFlag } from "@/lib/seed-data";
import { SurfaceType, MessageChannel } from "@/lib/types";

// Use in-memory database for tests
beforeEach(async () => {
  await db.delete();
  await db.open();
  resetSeedFlag();
});

describe("database schema", () => {
  it("has all expected tables", () => {
    const tableNames = db.tables.map((t) => t.name).sort();
    expect(tableNames).toEqual([
      "actuals",
      "appSettings",
      "calendarSyncQueue",
      "customers",
      "jobs",
      "messageTemplates",
      "paintPresets",
      "quotes",
      "rooms",
    ]);
  });

  it("can CRUD a customer", async () => {
    const id = "test-customer-1";
    await db.customers.add({
      id,
      name: "John Smith",
      phone: "555-1234",
      email: "john@example.com",
      address: "123 Main St",
      notes: "Has a dog",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const customer = await db.customers.get(id);
    expect(customer?.name).toBe("John Smith");
    expect(customer?.phone).toBe("555-1234");

    await db.customers.update(id, { name: "John D. Smith" });
    const updated = await db.customers.get(id);
    expect(updated?.name).toBe("John D. Smith");

    await db.customers.delete(id);
    const deleted = await db.customers.get(id);
    expect(deleted).toBeUndefined();
  });
});

describe("seed data", () => {
  it("seeds default paint presets", async () => {
    await seedDatabase();
    const presets = await db.paintPresets.toArray();
    expect(presets.length).toBe(9);

    const drywall = presets.find(
      (p) => p.surfaceType === SurfaceType.SmoothDrywall
    );
    expect(drywall?.coverageRate).toBe(375);
    expect(drywall?.laborRate).toBe(175);
    expect(drywall?.isDefault).toBe(true);
  });

  it("seeds default message templates", async () => {
    await seedDatabase();
    const templates = await db.messageTemplates.toArray();
    expect(templates.length).toBe(4);

    const quoteSent = templates.find((t) => t.name === "Quote Sent");
    expect(quoteSent?.channel).toBe(MessageChannel.SMS);
    expect(quoteSent?.body).toContain("{customer_name}");
    expect(quoteSent?.isDefault).toBe(true);
  });

  it("seeds default app settings", async () => {
    await seedDatabase();
    const settings = await db.appSettings.get("default");
    expect(settings?.defaultLaborRate).toBe(50);
    expect(settings?.defaultMarkupPercent).toBe(20);
    expect(settings?.backupReminderDays).toBe(30);
  });

  it("does not duplicate seed data on multiple calls", async () => {
    await seedDatabase();
    await seedDatabase();
    const presets = await db.paintPresets.toArray();
    expect(presets.length).toBe(9);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { seedDatabase, resetSeedFlag } from "@/lib/seed-data";
import { exportDatabase, importDatabase } from "@/lib/backup";

beforeEach(async () => {
  await db.delete();
  await db.open();
  resetSeedFlag();
});

describe("exportDatabase", () => {
  it("exports all tables as JSON with version", async () => {
    await seedDatabase();
    await db.customers.add({
      id: "c1", name: "Test Customer", phone: "555-1234", email: "", address: "", notes: "",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    const exported = await exportDatabase();
    const data = JSON.parse(exported);
    expect(data.version).toBe(1);
    expect(data.exportedAt).toBeDefined();
    expect(data.customers).toHaveLength(1);
    expect(data.customers[0].name).toBe("Test Customer");
    expect(data.paintPresets).toHaveLength(9);
    expect(data.messageTemplates).toHaveLength(4);
  });
});

describe("importDatabase", () => {
  it("restores data from exported JSON", async () => {
    await seedDatabase();
    await db.customers.add({
      id: "c1", name: "Test Customer", phone: "", email: "", address: "", notes: "",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    const exported = await exportDatabase();
    await db.delete();
    await db.open();
    await importDatabase(exported);

    const customers = await db.customers.toArray();
    expect(customers).toHaveLength(1);
    expect(customers[0].name).toBe("Test Customer");
    const presets = await db.paintPresets.toArray();
    expect(presets).toHaveLength(9);
  });

  it("throws on invalid JSON", async () => {
    await expect(importDatabase("not json")).rejects.toThrow();
  });

  it("throws on missing version", async () => {
    await expect(importDatabase(JSON.stringify({}))).rejects.toThrow("Invalid backup file");
  });
});

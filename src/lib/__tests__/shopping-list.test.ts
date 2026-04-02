import { describe, it, expect } from "vitest";
import { aggregateShoppingList, recommendPurchaseSize } from "@/lib/shopping-list";
import { ServiceType, RoomType, SurfaceType, FinishType, type Room } from "@/lib/types";

function makeRoom(overrides: Partial<Room>): Room {
  return {
    id: "r1", quoteId: "q1", name: "Test Room", serviceType: ServiceType.InteriorPaint,
    roomType: RoomType.Walls, length: 12, width: 10, height: 8, doorCount: 1, windowCount: 2,
    surfaceType: SurfaceType.SmoothDrywall, paintColor: "Revere Pewter",
    paintBrand: "Benjamin Moore", finishType: FinishType.Eggshell, coats: 2,
    pricePerGallon: 45, paintableSqFt: 302, gallonsNeeded: 1.76, estimatedLaborHours: 4,
    materialCost: 79.2, laborCost: 200, description: "", manualHours: null,
    manualCost: null, sortOrder: 0,
    includeTrim: false, includeDoors: false,
    ceilingColor: "", ceilingBrand: "", ceilingFinish: null, ceilingPricePerGallon: null,
    ceilingGallonsNeeded: 0,
    trimColor: "", trimBrand: "", trimFinish: null, trimPricePerGallon: null,
    trimGallonsNeeded: 0,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("aggregateShoppingList", () => {
  it("groups rooms by color + finish + brand", () => {
    const rooms = [makeRoom({ id: "r1", gallonsNeeded: 1.5 }), makeRoom({ id: "r2", gallonsNeeded: 2.0 })];
    const list = aggregateShoppingList(rooms);
    expect(list).toHaveLength(1);
    expect(list[0].totalGallons).toBeCloseTo(3.5);
  });

  it("separates different colors into different groups", () => {
    const rooms = [
      makeRoom({ id: "r1", paintColor: "Revere Pewter", gallonsNeeded: 1.5 }),
      makeRoom({ id: "r2", paintColor: "Simply White", gallonsNeeded: 1.0 }),
    ];
    const list = aggregateShoppingList(rooms);
    expect(list).toHaveLength(2);
  });

  it("excludes non-paint service types", () => {
    const rooms = [
      makeRoom({ id: "r1", gallonsNeeded: 1.5 }),
      makeRoom({ id: "r2", serviceType: ServiceType.PowerWashing, gallonsNeeded: 0, paintColor: "" }),
    ];
    const list = aggregateShoppingList(rooms);
    expect(list).toHaveLength(1);
  });

  it("includes ceiling paint as a separate shopping list item", () => {
    const rooms = [
      makeRoom({
        id: "r1",
        paintColor: "Revere Pewter",
        finishType: FinishType.Eggshell,
        paintBrand: "Benjamin Moore",
        gallonsNeeded: 1.5,
        ceilingColor: "Ceiling White",
        ceilingBrand: "Sherwin-Williams",
        ceilingFinish: FinishType.Flat,
        ceilingPricePerGallon: 38,
        ceilingGallonsNeeded: 1.0,
      }),
    ];
    const list = aggregateShoppingList(rooms);
    expect(list).toHaveLength(2);
    const ceilingItem = list.find((i) => i.paintColor === "Ceiling White");
    expect(ceilingItem).toBeDefined();
    expect(ceilingItem!.paintBrand).toBe("Sherwin-Williams");
    expect(ceilingItem!.finishType).toBe(FinishType.Flat);
    expect(ceilingItem!.totalGallons).toBeCloseTo(1.0);
    expect(ceilingItem!.pricePerGallon).toBe(38);
  });

  it("omits ceiling entry when ceilingColor is empty", () => {
    const rooms = [makeRoom({ id: "r1", gallonsNeeded: 1.5, ceilingColor: "", ceilingFinish: FinishType.Flat, ceilingGallonsNeeded: 1.0 })];
    const list = aggregateShoppingList(rooms);
    expect(list).toHaveLength(1);
    expect(list[0].paintColor).toBe("Revere Pewter");
  });

  it("omits ceiling entry when ceilingGallonsNeeded is 0 or missing", () => {
    const rooms = [makeRoom({ id: "r1", gallonsNeeded: 1.5, ceilingColor: "Ceiling White", ceilingFinish: FinishType.Flat })];
    const list = aggregateShoppingList(rooms);
    expect(list).toHaveLength(1);
  });

  it("includes trim paint as a separate shopping list item when includeTrim is true", () => {
    const rooms = [
      makeRoom({
        id: "r1",
        gallonsNeeded: 1.5,
        includeTrim: true,
        trimColor: "Bright White",
        trimBrand: "Behr",
        trimFinish: FinishType.SemiGloss,
        trimPricePerGallon: 42,
        trimGallonsNeeded: 0.5,
      }),
    ];
    const list = aggregateShoppingList(rooms);
    expect(list).toHaveLength(2);
    const trimItem = list.find((i) => i.paintColor === "Bright White");
    expect(trimItem).toBeDefined();
    expect(trimItem!.finishType).toBe(FinishType.SemiGloss);
    expect(trimItem!.totalGallons).toBeCloseTo(0.5);
    expect(trimItem!.pricePerGallon).toBe(42);
  });

  it("includes trim paint as a separate shopping list item when includeDoors is true", () => {
    const rooms = [
      makeRoom({
        id: "r1",
        gallonsNeeded: 1.5,
        includeDoors: true,
        trimColor: "Bright White",
        trimBrand: "Behr",
        trimFinish: FinishType.SemiGloss,
        trimPricePerGallon: 42,
        trimGallonsNeeded: 0.75,
      }),
    ];
    const list = aggregateShoppingList(rooms);
    expect(list).toHaveLength(2);
    const trimItem = list.find((i) => i.paintColor === "Bright White");
    expect(trimItem).toBeDefined();
    expect(trimItem!.totalGallons).toBeCloseTo(0.75);
  });

  it("omits trim entry when neither includeTrim nor includeDoors is true", () => {
    const rooms = [
      makeRoom({
        id: "r1",
        gallonsNeeded: 1.5,
        includeTrim: false,
        includeDoors: false,
        trimColor: "Bright White",
        trimBrand: "Behr",
        trimFinish: FinishType.SemiGloss,
        trimGallonsNeeded: 0.5,
      }),
    ];
    const list = aggregateShoppingList(rooms);
    expect(list).toHaveLength(1);
  });

  it("groups ceiling entries across rooms with the same color/finish/brand", () => {
    const rooms = [
      makeRoom({
        id: "r1",
        gallonsNeeded: 1.5,
        ceilingColor: "Ceiling White",
        ceilingBrand: "Sherwin-Williams",
        ceilingFinish: FinishType.Flat,
        ceilingPricePerGallon: 38,
        ceilingGallonsNeeded: 1.0,
      }),
      makeRoom({
        id: "r2",
        gallonsNeeded: 2.0,
        ceilingColor: "Ceiling White",
        ceilingBrand: "Sherwin-Williams",
        ceilingFinish: FinishType.Flat,
        ceilingPricePerGallon: 38,
        ceilingGallonsNeeded: 0.75,
      }),
    ];
    const list = aggregateShoppingList(rooms);
    // Wall paint grouped (same color/finish/brand), ceiling grouped
    expect(list).toHaveLength(2);
    const ceilingItem = list.find((i) => i.paintColor === "Ceiling White");
    expect(ceilingItem!.totalGallons).toBeCloseTo(1.75);
  });

  it("produces all three entries for a room with walls, ceiling, and trim", () => {
    const rooms = [
      makeRoom({
        id: "r1",
        paintColor: "Revere Pewter",
        finishType: FinishType.Eggshell,
        gallonsNeeded: 1.5,
        ceilingColor: "Ceiling White",
        ceilingFinish: FinishType.Flat,
        ceilingGallonsNeeded: 0.8,
        includeTrim: true,
        trimColor: "Bright White",
        trimFinish: FinishType.SemiGloss,
        trimGallonsNeeded: 0.25,
      }),
    ];
    const list = aggregateShoppingList(rooms);
    expect(list).toHaveLength(3);
    expect(list.map((i) => i.paintColor)).toEqual(
      expect.arrayContaining(["Revere Pewter", "Ceiling White", "Bright White"])
    );
  });
});

describe("recommendPurchaseSize", () => {
  it("recommends quarts for small amounts", () => {
    expect(recommendPurchaseSize(0.5)).toBe("2 quarts");
  });
  it("recommends gallons for medium amounts", () => {
    expect(recommendPurchaseSize(2.5)).toBe("3 gallons");
  });
  it("recommends 5-gallon buckets for large amounts", () => {
    expect(recommendPurchaseSize(8)).toBe("1 five-gallon + 3 gallons");
  });
  it("handles exact gallon amounts", () => {
    expect(recommendPurchaseSize(1.0)).toBe("1 gallon");
  });
});

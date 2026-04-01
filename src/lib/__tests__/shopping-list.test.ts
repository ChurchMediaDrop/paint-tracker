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
    manualCost: null, sortOrder: 0, ...overrides,
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

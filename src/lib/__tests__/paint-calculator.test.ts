import { describe, it, expect } from "vitest";
import {
  calculatePaintableArea,
  calculateGallonsNeeded,
  calculateLaborHours,
  calculateRoomCost,
  roundToNearestQuarterGallon,
} from "@/lib/paint-calculator";
import { RoomType } from "@/lib/types";

describe("calculatePaintableArea", () => {
  it("calculates wall area with door and window deductions", () => {
    const result = calculatePaintableArea({
      roomType: RoomType.Walls,
      length: 12, width: 10, height: 8, doorCount: 1, windowCount: 2,
    });
    expect(result).toBe(302);
  });

  it("calculates ceiling area as length * width", () => {
    const result = calculatePaintableArea({
      roomType: RoomType.Ceiling,
      length: 12, width: 10, height: 8, doorCount: 0, windowCount: 0,
    });
    expect(result).toBe(120);
  });

  it("calculates exterior area as length * height", () => {
    const result = calculatePaintableArea({
      roomType: RoomType.Exterior,
      length: 40, width: null, height: 10, doorCount: 1, windowCount: 4,
    });
    expect(result).toBe(320);
  });

  it("never returns negative area", () => {
    const result = calculatePaintableArea({
      roomType: RoomType.Walls,
      length: 5, width: 5, height: 8, doorCount: 10, windowCount: 10,
    });
    expect(result).toBe(0);
  });
});

describe("calculateGallonsNeeded", () => {
  it("calculates gallons with waste factor", () => {
    const result = calculateGallonsNeeded(300, 2, 375);
    expect(result).toBeCloseTo(1.76, 2);
  });

  it("returns 0 for 0 sq ft", () => {
    expect(calculateGallonsNeeded(0, 2, 375)).toBe(0);
  });
});

describe("roundToNearestQuarterGallon", () => {
  it("rounds up to nearest quarter gallon", () => {
    expect(roundToNearestQuarterGallon(1.76)).toBe(2.0);
    expect(roundToNearestQuarterGallon(1.1)).toBe(1.25);
    expect(roundToNearestQuarterGallon(1.0)).toBe(1.0);
    expect(roundToNearestQuarterGallon(0.3)).toBe(0.5);
  });
});

describe("calculateLaborHours", () => {
  it("calculates labor hours with 15% prep time", () => {
    const result = calculateLaborHours(300, 2, 175);
    expect(result).toBeCloseTo(3.94, 1);
  });
});

describe("calculateRoomCost", () => {
  it("calculates total room cost from gallons and hours", () => {
    const result = calculateRoomCost({
      gallonsNeeded: 2, pricePerGallon: 45, laborHours: 4, laborRate: 50,
    });
    expect(result.materialCost).toBe(90);
    expect(result.laborCost).toBe(200);
  });
});

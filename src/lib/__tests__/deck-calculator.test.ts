import { describe, it, expect } from "vitest";
import {
  calculateDeckFloorArea,
  calculateRailingArea,
  calculateStairArea,
  getDeckCoverageRate,
  calculateDeckEstimate,
} from "@/lib/deck-calculator";
import { StainType, WoodCondition } from "@/lib/types";

describe("calculateDeckFloorArea", () => {
  it("calculates floor area as length * width", () => {
    expect(calculateDeckFloorArea(20, 12)).toBe(240);
  });
  it("handles null dimensions as 0", () => {
    expect(calculateDeckFloorArea(null, 12)).toBe(0);
    expect(calculateDeckFloorArea(20, null)).toBe(0);
  });
});

describe("calculateRailingArea", () => {
  it("multiplies linear feet by 6", () => {
    expect(calculateRailingArea(30)).toBe(180);
  });
  it("returns 0 for 0 linear feet", () => {
    expect(calculateRailingArea(0)).toBe(0);
  });
});

describe("calculateStairArea", () => {
  it("multiplies step count by 5.5", () => {
    expect(calculateStairArea(8)).toBe(44);
  });
  it("returns 0 for 0 steps", () => {
    expect(calculateStairArea(0)).toBe(0);
  });
});

describe("getDeckCoverageRate", () => {
  it("returns correct rate for transparent + smooth", () => {
    expect(getDeckCoverageRate(StainType.Transparent, WoodCondition.Smooth)).toBe(300);
  });
  it("returns correct rate for semi-transparent + rough", () => {
    expect(getDeckCoverageRate(StainType.SemiTransparent, WoodCondition.Rough)).toBe(175);
  });
  it("returns correct rate for solid/paint + smooth", () => {
    expect(getDeckCoverageRate(StainType.SolidPaint, WoodCondition.Smooth)).toBe(200);
  });
  it("returns correct rate for solid/paint + rough", () => {
    expect(getDeckCoverageRate(StainType.SolidPaint, WoodCondition.Rough)).toBe(150);
  });
  it("returns correct rate for transparent + rough", () => {
    expect(getDeckCoverageRate(StainType.Transparent, WoodCondition.Rough)).toBe(200);
  });
  it("returns correct rate for semi-transparent + smooth", () => {
    expect(getDeckCoverageRate(StainType.SemiTransparent, WoodCondition.Smooth)).toBe(250);
  });
});

describe("calculateDeckEstimate", () => {
  const baseInput = {
    length: 20 as number | null,
    width: 12 as number | null,
    railingLinearFeet: 30,
    stairCount: 6,
    coats: 1,
    stainType: StainType.SemiTransparent,
    woodCondition: WoodCondition.Smooth,
    pricePerGallon: 40,
    laborProductionRate: 120,
  };

  it("calculates total area from floor + railing + stairs", () => {
    const result = calculateDeckEstimate(baseInput);
    expect(result.floorSqFt).toBe(240);
    expect(result.railingSqFt).toBe(180);
    expect(result.stairSqFt).toBe(33);
    expect(result.totalSqFt).toBe(453);
  });

  it("calculates gallons with waste factor", () => {
    const result = calculateDeckEstimate(baseInput);
    // 453 * 1 / 250 * 1.10 = 1.9932
    expect(result.rawGallons).toBeCloseTo(1.9932, 3);
  });

  it("calculates labor hours with prep factor", () => {
    const result = calculateDeckEstimate(baseInput);
    // 453 * 1 / 120 * 1.15 = 4.34125
    expect(result.laborHours).toBeCloseTo(4.341, 2);
  });

  it("calculates material cost from raw gallons", () => {
    const result = calculateDeckEstimate(baseInput);
    // 1.9932 * 40 = ~79.73
    expect(result.materialCost).toBeCloseTo(79.73, 0);
  });

  it("handles 2 coats", () => {
    const input = { ...baseInput, coats: 2 };
    const result = calculateDeckEstimate(input);
    expect(result.rawGallons).toBeCloseTo(3.9864, 3);
  });

  it("handles rough wood with lower coverage", () => {
    const input = { ...baseInput, woodCondition: WoodCondition.Rough };
    const result = calculateDeckEstimate(input);
    // 453 * 1 / 175 * 1.10 = 2.847
    expect(result.rawGallons).toBeCloseTo(2.847, 2);
  });

  it("returns zeros when no dimensions", () => {
    const input = { ...baseInput, length: null, width: null, railingLinearFeet: 0, stairCount: 0 };
    const result = calculateDeckEstimate(input);
    expect(result.totalSqFt).toBe(0);
    expect(result.rawGallons).toBe(0);
  });
});

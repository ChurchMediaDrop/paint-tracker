import { describe, it, expect } from "vitest";
import {
  calculateTrimArea,
  calculateDoorArea,
  calculateComponentEstimates,
  type ComponentEstimate,
} from "@/lib/component-calculator";

describe("calculateTrimArea", () => {
  it("calculates baseboard area from room perimeter", () => {
    // Perimeter = 2 * (12 + 10) = 44 ft, baseboard height = 0.5 ft
    const result = calculateTrimArea(12, 10);
    expect(result).toBe(22);
  });

  it("handles null dimensions as 0", () => {
    const result = calculateTrimArea(null, null);
    expect(result).toBe(0);
  });
});

describe("calculateDoorArea", () => {
  it("calculates door area from count", () => {
    const result = calculateDoorArea(3);
    expect(result).toBe(60); // 3 * 20
  });

  it("returns 0 for 0 doors", () => {
    expect(calculateDoorArea(0)).toBe(0);
  });
});

describe("calculateComponentEstimates", () => {
  const baseInput = {
    length: 12 as number | null,
    width: 10 as number | null,
    height: 8 as number | null,
    doorCount: 2,
    windowCount: 1,
    coats: 2,
    includeWalls: true,
    includeCeiling: false,
    includeTrim: false,
    includeDoors: false,
    wallCoverageRate: 350,
    wallLaborRate: 200,
    wallPricePerGallon: 45,
    ceilingCoverageRate: 400,
    ceilingLaborRate: 250,
    ceilingPricePerGallon: 40,
    trimCoverageRate: 300,
    trimLaborRate: 150,
    trimPricePerGallon: 50,
  };

  it("calculates walls-only estimate with door deduction when doors not painted", () => {
    const result = calculateComponentEstimates(baseInput);
    expect(result.walls).not.toBeNull();
    // Wall area: 2*(12+10)*8 = 352, minus doors: 2*20=40, minus windows: 1*15=15 => 297 sq ft
    expect(result.walls!.paintableSqFt).toBe(297);
    expect(result.ceiling).toBeNull();
    expect(result.trim).toBeNull();
    expect(result.doors).toBeNull();
  });

  it("does not deduct doors from wall area when doors are being painted", () => {
    const input = { ...baseInput, includeDoors: true };
    const result = calculateComponentEstimates(input);
    // Wall area: 352, minus windows only: 15 => 337 sq ft
    expect(result.walls!.paintableSqFt).toBe(337);
    // Doors: 2 * 20 = 40 sq ft
    expect(result.doors).not.toBeNull();
    expect(result.doors!.paintableSqFt).toBe(40);
  });

  it("calculates ceiling estimate", () => {
    const input = { ...baseInput, includeCeiling: true };
    const result = calculateComponentEstimates(input);
    // Ceiling area: 12 * 10 = 120 sq ft
    expect(result.ceiling).not.toBeNull();
    expect(result.ceiling!.paintableSqFt).toBe(120);
  });

  it("calculates trim estimate", () => {
    const input = { ...baseInput, includeTrim: true };
    const result = calculateComponentEstimates(input);
    // Trim area: 2 * (12 + 10) * 0.5 = 22 sq ft
    expect(result.trim).not.toBeNull();
    expect(result.trim!.paintableSqFt).toBe(22);
  });

  it("calculates raw gallons for material cost (not rounded)", () => {
    const input = { ...baseInput, includeTrim: true };
    const result = calculateComponentEstimates(input);
    // Trim: 22 sqft * 2 coats / 300 coverage * 1.10 waste = 0.1613 gal
    // Material cost = 0.1613 * 50 = ~8.07
    expect(result.trim!.rawGallons).toBeCloseTo(0.1613, 3);
    expect(result.trim!.materialCost).toBeCloseTo(8.07, 0);
  });

  it("sums totals across all active components", () => {
    const input = {
      ...baseInput,
      includeCeiling: true,
      includeTrim: true,
      includeDoors: true,
    };
    const result = calculateComponentEstimates(input);
    const totalSqFt =
      (result.walls?.paintableSqFt ?? 0) +
      (result.ceiling?.paintableSqFt ?? 0) +
      (result.trim?.paintableSqFt ?? 0) +
      (result.doors?.paintableSqFt ?? 0);
    expect(result.totalPaintableSqFt).toBe(totalSqFt);
    expect(result.totalRawGallons).toBeCloseTo(
      (result.walls?.rawGallons ?? 0) +
      (result.ceiling?.rawGallons ?? 0) +
      (result.trim?.rawGallons ?? 0) +
      (result.doors?.rawGallons ?? 0),
      4
    );
  });

  it("returns all nulls when nothing is selected", () => {
    const input = { ...baseInput, includeWalls: false };
    const result = calculateComponentEstimates(input);
    expect(result.walls).toBeNull();
    expect(result.ceiling).toBeNull();
    expect(result.trim).toBeNull();
    expect(result.doors).toBeNull();
    expect(result.totalPaintableSqFt).toBe(0);
  });
});

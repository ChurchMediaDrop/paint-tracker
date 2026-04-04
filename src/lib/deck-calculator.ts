import { StainType, WoodCondition } from "@/lib/types";
import { WASTE_FACTOR, PREP_TIME_FACTOR } from "@/lib/paint-calculator";

const RAILING_SQ_FT_PER_LINEAR_FT = 6;
const STAIR_SQ_FT_PER_STEP = 5.5;

const COVERAGE_RATES: Record<StainType, Record<WoodCondition, number>> = {
  [StainType.Transparent]: { [WoodCondition.Smooth]: 300, [WoodCondition.Rough]: 200 },
  [StainType.SemiTransparent]: { [WoodCondition.Smooth]: 250, [WoodCondition.Rough]: 175 },
  [StainType.SolidPaint]: { [WoodCondition.Smooth]: 200, [WoodCondition.Rough]: 150 },
};

export function calculateDeckFloorArea(length: number | null, width: number | null): number {
  return (length ?? 0) * (width ?? 0);
}

export function calculateRailingArea(linearFeet: number): number {
  return linearFeet * RAILING_SQ_FT_PER_LINEAR_FT;
}

export function calculateStairArea(stepCount: number): number {
  return stepCount * STAIR_SQ_FT_PER_STEP;
}

export function getDeckCoverageRate(stainType: StainType, woodCondition: WoodCondition): number {
  return COVERAGE_RATES[stainType]?.[woodCondition] ?? 250;
}

export interface DeckEstimate {
  floorSqFt: number;
  railingSqFt: number;
  stairSqFt: number;
  totalSqFt: number;
  rawGallons: number;
  laborHours: number;
  materialCost: number;
}

interface DeckEstimateInput {
  length: number | null;
  width: number | null;
  railingLinearFeet: number;
  stairCount: number;
  coats: number;
  stainType: StainType;
  woodCondition: WoodCondition;
  pricePerGallon: number;
  laborProductionRate: number;
}

export function calculateDeckEstimate(input: DeckEstimateInput): DeckEstimate {
  const floorSqFt = calculateDeckFloorArea(input.length, input.width);
  const railingSqFt = calculateRailingArea(input.railingLinearFeet);
  const stairSqFt = calculateStairArea(input.stairCount);
  const totalSqFt = floorSqFt + railingSqFt + stairSqFt;

  const coverageRate = getDeckCoverageRate(input.stainType, input.woodCondition);

  const rawGallons =
    totalSqFt === 0 || coverageRate === 0
      ? 0
      : ((totalSqFt * input.coats) / coverageRate) * WASTE_FACTOR;

  const laborHours =
    totalSqFt === 0 || input.laborProductionRate === 0
      ? 0
      : ((totalSqFt * input.coats) / input.laborProductionRate) * PREP_TIME_FACTOR;

  return {
    floorSqFt,
    railingSqFt,
    stairSqFt,
    totalSqFt,
    rawGallons,
    laborHours,
    materialCost: rawGallons * input.pricePerGallon,
  };
}

import { ServiceType, FinishType, type Room } from "@/lib/types";
import { roundToNearestQuarterGallon } from "@/lib/paint-calculator";

export interface ShoppingListItem {
  paintColor: string;
  paintBrand: string;
  finishType: FinishType;
  totalGallons: number;
  purchaseGallons: number;
  purchaseRecommendation: string;
  pricePerGallon: number;
  totalCost: number;
}

export function aggregateShoppingList(rooms: Room[]): ShoppingListItem[] {
  const paintRooms = rooms.filter(
    (r) => (r.serviceType === ServiceType.InteriorPaint || r.serviceType === ServiceType.ExteriorPaint) && r.paintColor && r.gallonsNeeded > 0
  );

  const groups = new Map<string, Room[]>();
  for (const room of paintRooms) {
    const key = `${room.paintColor}|${room.finishType}|${room.paintBrand}`;
    const existing = groups.get(key) ?? [];
    existing.push(room);
    groups.set(key, existing);
  }

  return Array.from(groups.entries()).map(([, groupRooms]) => {
    const first = groupRooms[0];
    const totalGallons = groupRooms.reduce((sum, r) => sum + r.gallonsNeeded, 0);
    const purchaseGallons = roundToNearestQuarterGallon(totalGallons);
    const pricePerGallon = first.pricePerGallon ?? 0;

    return {
      paintColor: first.paintColor,
      paintBrand: first.paintBrand,
      finishType: first.finishType!,
      totalGallons,
      purchaseGallons,
      purchaseRecommendation: recommendPurchaseSize(purchaseGallons),
      pricePerGallon,
      totalCost: purchaseGallons * pricePerGallon,
    };
  });
}

export function recommendPurchaseSize(gallons: number): string {
  if (gallons <= 0) return "0 gallons";
  if (gallons < 1) {
    const quarts = Math.ceil(gallons * 4);
    return `${quarts} quart${quarts !== 1 ? "s" : ""}`;
  }
  const roundedUp = Math.ceil(gallons);
  if (roundedUp < 5) {
    return `${roundedUp} gallon${roundedUp !== 1 ? "s" : ""}`;
  }
  const fiveGallons = Math.floor(roundedUp / 5);
  const remainingGallons = roundedUp % 5;
  if (remainingGallons === 0) {
    return `${fiveGallons} five-gallon${fiveGallons !== 1 ? "s" : ""}`;
  }
  return `${fiveGallons} five-gallon + ${remainingGallons} gallon${remainingGallons !== 1 ? "s" : ""}`;
}

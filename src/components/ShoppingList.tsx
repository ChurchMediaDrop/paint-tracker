"use client";

import { aggregateShoppingList } from "@/lib/shopping-list";
import { formatCurrency, formatFinishType } from "@/lib/format";
import type { Room } from "@/lib/types";

interface ShoppingListProps {
  rooms: Room[];
}

export default function ShoppingList({ rooms }: ShoppingListProps) {
  const items = aggregateShoppingList(rooms);

  if (items.length === 0) {
    return null;
  }

  const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest">
        Paint Shopping List
      </h3>
      <div className="flex flex-col gap-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="text-white font-semibold text-[15px] truncate">
                  {item.paintColor || "No color specified"}
                </p>
                <p className="text-white/50 text-[13px] mt-0.5">
                  {item.paintBrand && `${item.paintBrand} · `}
                  {formatFinishType(item.finishType)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-orange-400 font-bold text-[15px]">
                  {formatCurrency(item.totalCost)}
                </p>
                <p className="text-white/40 text-[12px]">
                  {formatCurrency(item.pricePerGallon)}/gal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2 border-t border-white/[0.06]">
              <div>
                <p className="text-white/40 text-[11px]">Calculated</p>
                <p className="text-white text-[13px] font-medium">
                  {item.totalGallons.toFixed(2)} gal
                </p>
              </div>
              <div>
                <p className="text-white/40 text-[11px]">Purchase</p>
                <p className="text-white text-[13px] font-medium">
                  {item.purchaseGallons} gal
                </p>
              </div>
              <div className="ml-auto">
                <span className="bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[12px] font-medium px-2.5 py-1 rounded-full">
                  {item.purchaseRecommendation}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <p className="text-white/50 text-[14px] font-medium">Total Paint Cost</p>
          <p className="text-orange-400 font-bold text-[17px]">{formatCurrency(totalCost)}</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { formatCurrency, formatServiceType } from "@/lib/format";
import type { Quote, Room } from "@/lib/types";
import { ServiceType } from "@/lib/types";
import ShoppingList from "@/components/ShoppingList";

interface QuoteSummaryProps {
  quote: Quote;
  rooms: Room[];
  onMarkupChange?: (percent: number) => void;
  onLaborRateChange?: (rate: number) => void;
}

export default function QuoteSummary({
  quote,
  rooms,
  onMarkupChange,
  onLaborRateChange,
}: QuoteSummaryProps) {
  const totalMaterials = rooms.reduce(
    (sum, r) => sum + (r.materialCost || r.manualCost || 0),
    0
  );
  const totalLaborHours = rooms.reduce(
    (sum, r) => sum + (r.estimatedLaborHours || r.manualHours || 0),
    0
  );
  const totalLabor = totalLaborHours * quote.laborRate;
  const subtotal = totalMaterials + totalLabor;
  const markupAmount = subtotal * (quote.markupPercent / 100);
  const totalPrice = subtotal + markupAmount;

  const paintRooms = rooms.filter(
    (r) =>
      r.serviceType === ServiceType.InteriorPaint ||
      r.serviceType === ServiceType.ExteriorPaint
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Rooms Breakdown */}
      {rooms.length > 0 && (
        <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest">
              Rooms
            </h3>
          </div>
          <div className="flex flex-col">
            {rooms.map((room, idx) => (
              <div
                key={room.id}
                className={`px-4 py-3.5 ${
                  idx < rooms.length - 1 ? "border-b border-white/[0.06]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-[14px] font-medium truncate">
                      {room.name}
                    </p>
                    <p className="text-white/40 text-[12px] mt-0.5">
                      {formatServiceType(room.serviceType)}
                      {room.paintColor && ` · ${room.paintColor}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white text-[14px] font-semibold">
                      {formatCurrency((room.materialCost || room.manualCost || 0) + (room.laborCost || 0))}
                    </p>
                    {room.paintableSqFt > 0 && (
                      <p className="text-white/30 text-[11px]">
                        {Math.round(room.paintableSqFt)} sq ft
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 mt-1.5">
                  {(room.materialCost > 0 || (room.manualCost ?? 0) > 0) && (
                    <span className="text-white/40 text-[12px]">
                      Materials: {formatCurrency(room.materialCost || room.manualCost || 0)}
                    </span>
                  )}
                  {room.laborCost > 0 && (
                    <span className="text-white/40 text-[12px]">
                      Labor: {formatCurrency(room.laborCost)}
                    </span>
                  )}
                  {room.gallonsNeeded > 0 && (
                    <span className="text-white/40 text-[12px]">
                      {room.gallonsNeeded} gal
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shopping List */}
      {paintRooms.length > 0 && <ShoppingList rooms={paintRooms} />}

      {/* Rate Settings */}
      <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
        <h3 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest mb-3">
          Rates
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <label className="text-white/70 text-[14px]">Labor Rate ($/hr)</label>
            {onLaborRateChange ? (
              <input
                type="number"
                defaultValue={quote.laborRate}
                onBlur={(e) => onLaborRateChange(parseFloat(e.target.value) || quote.laborRate)}
                inputMode="decimal"
                className="w-24 bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2 text-white text-[15px] text-right focus:outline-none focus:border-orange-500/60"
              />
            ) : (
              <p className="text-white text-[15px] font-semibold">
                {formatCurrency(quote.laborRate)}/hr
              </p>
            )}
          </div>
          <div className="flex items-center justify-between gap-4">
            <label className="text-white/70 text-[14px]">Markup (%)</label>
            {onMarkupChange ? (
              <input
                type="number"
                defaultValue={quote.markupPercent}
                onBlur={(e) => onMarkupChange(parseFloat(e.target.value) || quote.markupPercent)}
                inputMode="decimal"
                className="w-24 bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2 text-white text-[15px] text-right focus:outline-none focus:border-orange-500/60"
              />
            ) : (
              <p className="text-white text-[15px] font-semibold">
                {quote.markupPercent}%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
        <h3 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest mb-3">
          Total Breakdown
        </h3>
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between">
            <span className="text-white/60 text-[14px]">Materials</span>
            <span className="text-white text-[14px] font-medium">{formatCurrency(totalMaterials)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60 text-[14px]">
              Labor ({totalLaborHours.toFixed(1)} hrs @ {formatCurrency(quote.laborRate)}/hr)
            </span>
            <span className="text-white text-[14px] font-medium">{formatCurrency(totalLabor)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60 text-[14px]">Subtotal</span>
            <span className="text-white text-[14px] font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60 text-[14px]">Markup ({quote.markupPercent}%)</span>
            <span className="text-white text-[14px] font-medium">{formatCurrency(markupAmount)}</span>
          </div>
          <div className="flex justify-between pt-2.5 border-t border-white/[0.10] mt-0.5">
            <span className="text-white font-semibold text-[16px]">Total Price</span>
            <span className="text-orange-400 font-bold text-[20px]">{formatCurrency(totalPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

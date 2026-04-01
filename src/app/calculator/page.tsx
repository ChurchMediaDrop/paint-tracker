"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { usePaintPresets } from "@/hooks/useSettings";
import {
  calculatePaintableArea,
  calculateGallonsNeeded,
  calculateLaborHours,
  roundToNearestQuarterGallon,
} from "@/lib/paint-calculator";
import { recommendPurchaseSize } from "@/lib/shopping-list";
import { formatSurfaceType } from "@/lib/format";
import { RoomType, SurfaceType } from "@/lib/types";

const ROOM_TYPES = [
  { value: RoomType.Walls, label: "Walls" },
  { value: RoomType.Ceiling, label: "Ceiling" },
  { value: RoomType.Exterior, label: "Exterior" },
];

const SURFACE_TYPES = Object.values(SurfaceType);

export default function CalculatorPage() {
  const presets = usePaintPresets();

  const [roomType, setRoomType] = useState<RoomType>(RoomType.Walls);
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [doorCount, setDoorCount] = useState("0");
  const [windowCount, setWindowCount] = useState("0");
  const [surfaceType, setSurfaceType] = useState<SurfaceType>(SurfaceType.SmoothDrywall);
  const [coats, setCoats] = useState(2);

  const preset = useMemo(
    () => presets.find((p) => p.surfaceType === surfaceType),
    [presets, surfaceType]
  );

  const results = useMemo(() => {
    const l = parseFloat(length) || null;
    const w = parseFloat(width) || null;
    const h = parseFloat(height) || null;
    const doors = parseInt(doorCount) || 0;
    const windows = parseInt(windowCount) || 0;

    const paintableSqFt = calculatePaintableArea({
      roomType,
      length: l,
      width: w,
      height: h,
      doorCount: doors,
      windowCount: windows,
    });

    const coverageRate = preset?.coverageRate ?? 350;
    const laborProductionRate = preset?.laborRate ?? 150;

    const rawGallons = calculateGallonsNeeded(paintableSqFt, coats, coverageRate);
    const roundedGallons = roundToNearestQuarterGallon(rawGallons);
    const purchaseRecommendation = recommendPurchaseSize(roundedGallons);
    const laborHours = calculateLaborHours(paintableSqFt, coats, laborProductionRate);

    return { paintableSqFt, rawGallons, roundedGallons, purchaseRecommendation, laborHours };
  }, [roomType, length, width, height, doorCount, windowCount, surfaceType, coats, preset]);

  const hasInput =
    (parseFloat(length) > 0 || parseFloat(height) > 0 || parseFloat(width) > 0);

  const showWidth = roomType === RoomType.Walls || roomType === RoomType.Ceiling;
  const showHeight = roomType === RoomType.Walls || roomType === RoomType.Exterior;
  const showDoorWindow = roomType === RoomType.Walls || roomType === RoomType.Exterior;

  return (
    <AppShell showBack title="Calculator">
      <div className="flex flex-col px-4 pb-28 pt-4 gap-4">

        {/* Room Type Selector */}
        <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] p-1 flex gap-1">
          {ROOM_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRoomType(value)}
              className={[
                "flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-all min-h-[44px]",
                roomType === value
                  ? "bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-purple-900/30"
                  : "text-white/40 active:text-white/60 active:bg-white/[0.05]",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Dimensions */}
        <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
          <h2 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest mb-3">
            Dimensions (ft)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/50 text-[12px] font-medium mb-1">Length</label>
              <input
                type="number"
                inputMode="decimal"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                placeholder="0"
                className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white text-[16px] font-medium focus:outline-none focus:border-violet-500/60 placeholder-white/25"
              />
            </div>
            {showWidth && (
              <div>
                <label className="block text-white/50 text-[12px] font-medium mb-1">Width</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white text-[16px] font-medium focus:outline-none focus:border-violet-500/60 placeholder-white/25"
                />
              </div>
            )}
            {showHeight && (
              <div>
                <label className="block text-white/50 text-[12px] font-medium mb-1">Height</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white text-[16px] font-medium focus:outline-none focus:border-violet-500/60 placeholder-white/25"
                />
              </div>
            )}
          </div>
        </div>

        {/* Doors & Windows */}
        {showDoorWindow && (
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
            <h2 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest mb-3">
              Deductions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-white/50 text-[12px] font-medium mb-1">Doors</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDoorCount((v) => String(Math.max(0, parseInt(v) - 1)))}
                    className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.12] text-white text-lg font-medium active:bg-white/15 transition-colors flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center text-white text-[17px] font-semibold">{doorCount}</span>
                  <button
                    onClick={() => setDoorCount((v) => String(parseInt(v) + 1))}
                    className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.12] text-white text-lg font-medium active:bg-white/15 transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-white/50 text-[12px] font-medium mb-1">Windows</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWindowCount((v) => String(Math.max(0, parseInt(v) - 1)))}
                    className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.12] text-white text-lg font-medium active:bg-white/15 transition-colors flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center text-white text-[17px] font-semibold">{windowCount}</span>
                  <button
                    onClick={() => setWindowCount((v) => String(parseInt(v) + 1))}
                    className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.12] text-white text-lg font-medium active:bg-white/15 transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Surface Type */}
        <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
          <h2 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest mb-3">
            Surface Type
          </h2>
          <div className="relative">
            <select
              value={surfaceType}
              onChange={(e) => setSurfaceType(e.target.value as SurfaceType)}
              className="w-full appearance-none bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-3 text-white text-[15px] focus:outline-none focus:border-violet-500/60 pr-10"
            >
              {SURFACE_TYPES.map((st) => (
                <option key={st} value={st} className="bg-neutral-900 text-white">
                  {formatSurfaceType(st)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                <path d="M1 1L6 7L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Coats */}
        <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
          <h2 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest mb-3">
            Number of Coats
          </h2>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setCoats(n)}
                className={[
                  "flex-1 py-3 rounded-xl text-[17px] font-semibold transition-all min-h-[44px]",
                  coats === n
                    ? "bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-md shadow-purple-900/30"
                    : "bg-white/[0.08] border border-white/[0.12] text-white/50 active:bg-white/15",
                ].join(" ")}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Live Results Card */}
        <div
          className={[
            "rounded-2xl border px-5 py-5 transition-all duration-300",
            hasInput
              ? "bg-gradient-to-br from-violet-900/40 to-purple-900/30 border-violet-500/30 shadow-lg shadow-violet-900/20"
              : "bg-white/[0.04] border-white/[0.06]",
          ].join(" ")}
        >
          <h2 className={[
            "text-[12px] font-semibold uppercase tracking-widest mb-4 transition-colors duration-300",
            hasInput ? "text-violet-300" : "text-white/40",
          ].join(" ")}>
            Live Results
          </h2>

          {!hasInput ? (
            <p className="text-white/30 text-[14px] text-center py-4">
              Enter dimensions above to see results
            </p>
          ) : (
            <div className="flex flex-col gap-0">
              {/* Paintable sq ft */}
              <div className="flex items-center justify-between py-3 border-b border-white/[0.08]">
                <span className="text-white/60 text-[14px]">Paintable Area</span>
                <div className="text-right">
                  <span className="text-white text-[22px] font-bold tabular-nums">
                    {results.paintableSqFt.toFixed(0)}
                  </span>
                  <span className="text-white/40 text-[13px] ml-1.5">sq ft</span>
                </div>
              </div>

              {/* Gallons */}
              <div className="flex items-center justify-between py-3 border-b border-white/[0.08]">
                <div>
                  <span className="text-white/60 text-[14px] block">Paint Needed</span>
                  <span className="text-violet-300 text-[12px] font-medium">
                    {results.purchaseRecommendation}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-white text-[22px] font-bold tabular-nums">
                    {results.roundedGallons.toFixed(2)}
                  </span>
                  <span className="text-white/40 text-[13px] ml-1.5">gal</span>
                </div>
              </div>

              {/* Labor hours */}
              <div className="flex items-center justify-between py-3">
                <span className="text-white/60 text-[14px]">Est. Labor</span>
                <div className="text-right">
                  <span className="text-white text-[22px] font-bold tabular-nums">
                    {results.laborHours.toFixed(1)}
                  </span>
                  <span className="text-white/40 text-[13px] ml-1.5">hrs</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add to Quote */}
        <Link
          href="/quotes/new"
          className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform shadow-lg shadow-orange-900/30 mt-1"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M9 3V15M3 9H15" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
          Add to Quote
        </Link>
      </div>
    </AppShell>
  );
}

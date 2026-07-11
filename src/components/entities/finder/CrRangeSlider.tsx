"use client";

import { CR_SCALE, formatCr } from "./crScale";

export interface CrRangeSliderProps {
  minIndex: number;
  maxIndex: number;
  onChange: (minIndex: number, maxIndex: number) => void;
}

const THUMB_CLASSES =
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[15px] [&::-webkit-slider-thumb]:h-[15px] [&::-webkit-slider-thumb]:rounded-pill [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:shadow-card [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-[15px] [&::-moz-range-thumb]:h-[15px] [&::-moz-range-thumb]:rounded-pill [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:cursor-pointer";

/**
 * Two-handle CR range slider (screen 11's monster filters), built from two
 * overlapping native range inputs rather than custom pointer-drag
 * handling: keyboard-operable for free, no extra dependency.
 */
export function CrRangeSlider({ minIndex, maxIndex, onChange }: CrRangeSliderProps) {
  const maxI = CR_SCALE.length - 1;
  const minPct = (minIndex / maxI) * 100;
  const maxPct = (maxIndex / maxI) * 100;

  return (
    <div>
      <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-text-label mb-[5px]">
        CR Range: {formatCr(CR_SCALE[minIndex])}–{formatCr(CR_SCALE[maxIndex])}
      </span>
      <div className="relative h-[15px] mx-[2px]">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[4px] rounded-pill bg-border-default" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-[4px] rounded-pill bg-accent"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
        />
        <input
          type="range"
          aria-label="Minimum CR"
          min={0}
          max={maxI}
          value={minIndex}
          onChange={(event) => onChange(Math.min(Number(event.target.value), maxIndex), maxIndex)}
          className={`absolute inset-x-0 top-0 w-full h-[15px] appearance-none bg-transparent pointer-events-none ${THUMB_CLASSES}`}
        />
        <input
          type="range"
          aria-label="Maximum CR"
          min={0}
          max={maxI}
          value={maxIndex}
          onChange={(event) => onChange(minIndex, Math.max(Number(event.target.value), minIndex))}
          className={`absolute inset-x-0 top-0 w-full h-[15px] appearance-none bg-transparent pointer-events-none ${THUMB_CLASSES}`}
        />
      </div>
    </div>
  );
}

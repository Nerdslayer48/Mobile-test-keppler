import type { PointerEvent } from "react";

export type CardSide = "top" | "right" | "bottom" | "left";
const positions: Record<CardSide, string> = {
  top: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
  right: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
  bottom: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
  left: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
};

export function CardNodes({ onStart, onEnd, onKeyboardConnect, connectedSides = [], zoom = 1 }: {
  zoom?: number;
  connectedSides?: CardSide[];
  onStart?: (side: CardSide, event: PointerEvent<HTMLButtonElement>) => void;
  onEnd?: (side: CardSide) => void;
  onKeyboardConnect?: (side: CardSide) => void;
}) {
  return (Object.keys(positions) as CardSide[]).map(side => (
    <button key={side} type="button" aria-label={`Connect card from ${side}`} title="Drag to another node, or click two nodes to connect"
      className={`group/node absolute z-20 flex h-10 w-10 items-center justify-center rounded-full bg-transparent outline-none ${positions[side]}`}
      style={{ scale: 1 / zoom }}
      onPointerDown={event => { event.stopPropagation(); onStart?.(side, event); }}
      onPointerUp={event => { event.stopPropagation(); onEnd?.(side); }}
      onClick={event => { event.stopPropagation(); if (event.detail === 0) onKeyboardConnect?.(side); }}>
      <span aria-hidden="true" className={`pointer-events-none h-5 w-5 rounded-full border-2 opacity-0 transition-opacity group-hover/node:opacity-100 group-focus-visible/node:opacity-100 ${connectedSides.includes(side) ? "border-primary bg-primary" : "border-border bg-card"}`} />
    </button>
  ));
}

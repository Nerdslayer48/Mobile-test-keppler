import { useLayoutEffect, useRef } from "react";
import type { PointerEvent } from "react";
import { FiArrowUp, FiArrowDown, FiPlus } from "react-icons/fi";
import type { CardInput } from "../../types/workspaceStorage";

interface Props {
  input: CardInput;
  index: number;
  selected: boolean;
  autoFocus?: boolean;
  first: boolean;
  last: boolean;
  onSelect: () => void;
  onChange: (input: CardInput) => void;
  onReorder: (offset: number) => void;
  onDuplicate?: (targetCard: string) => void;
  onMedia?: (files?: File[]) => void;
}

export function CardInputBox({ input, index, selected, autoFocus, first, last, onSelect, onChange, onReorder, onDuplicate, onMedia }: Props) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const active = useRef<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    const fitText = () => {
      element.style.height = "0px";
      element.style.height = `${Math.max(60, element.scrollHeight)}px`;
    };
    fitText();
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth !== width) { width = element.clientWidth; fitText(); }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [input.text]);

  const begin = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onSelect();
    if (event.button !== 0 || !event.altKey) return;
    event.preventDefault();
    active.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  return <div data-card-input={input.id} tabIndex={0} aria-label={`Input box ${index + 1}`}
    className={`relative w-full min-w-0 min-h-fit shrink-0 border bg-input-bg p-3 text-text-primary ${selected ? "border-primary" : "border-border"}`}
    onFocus={onSelect} onPointerDown={begin}
    onPointerMove={event => {
      const gesture = active.current;
      if (!gesture) return;
      event.stopPropagation();
      event.currentTarget.style.cursor = "copy";
    }}
    onPointerUp={event => {
      const gesture = active.current;
      if (!gesture) return;
      event.stopPropagation();
      active.current = null;
      event.currentTarget.style.cursor = "";
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 5) {
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-media-id]");
        if (target?.dataset.mediaId) onDuplicate?.(target.dataset.mediaId);
      }
    }}
    onPointerCancel={() => { active.current = null; }}
    onDragOver={event => { event.preventDefault(); event.stopPropagation(); }}
    onDrop={event => { event.preventDefault(); event.stopPropagation(); onMedia?.(Array.from(event.dataTransfer.files)); }}>
    <textarea ref={textarea} aria-label={`Card input ${index + 1}`} placeholder="Start typing..." autoFocus={autoFocus} value={input.text}
      className="block w-full resize-none overflow-hidden whitespace-pre-wrap break-words bg-transparent text-sm outline-none placeholder:text-text-muted/40"
      onChange={event => onChange({ ...input, text: event.target.value })}
      onPaste={event => { if (event.clipboardData.files.length) { event.preventDefault(); event.stopPropagation(); onMedia?.(Array.from(event.clipboardData.files)); } }} />
    {input.media?.map(media => <div key={media.id} className="mt-2">
      {media.kind === "image" ? <img src={media.url} alt={media.name} className="h-auto w-full" draggable={false} /> : <video src={media.url} aria-label={media.name} controls className="h-auto w-full" />}
    </div>)}
    <div className="mt-2 flex items-center gap-1">
      {onMedia && <button type="button" aria-label={`Add media to input ${index + 1}`} className="rounded p-1 text-text-muted hover:bg-button-bg" onClick={() => onMedia?.()}><FiPlus size={12} /></button>}
      {selected && <>
        <button type="button" aria-label="Move input up" disabled={first} className="rounded p-1 hover:bg-button-bg disabled:opacity-30" onClick={() => onReorder(-1)}><FiArrowUp size={12} /></button>
        <button type="button" aria-label="Move input down" disabled={last} className="rounded p-1 hover:bg-button-bg disabled:opacity-30" onClick={() => onReorder(1)}><FiArrowDown size={12} /></button>
      </>}
    </div>
  </div>;
}

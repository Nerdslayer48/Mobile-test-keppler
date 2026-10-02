import { navigate } from "../../navigation";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { FiMinus, FiPlus, FiMaximize } from "react-icons/fi";
import { readBoard, writeBoard } from "../../types/workspaceStorage";
import type { BoardMedia } from "../../types/workspaceStorage";
import { ProjectInfo } from "../03_PopUps/ProjectInfo";
import type { WorkspaceTool } from "../03_PopUps/ToolBar";
import { ToolBar } from "../03_PopUps/ToolBar";

interface ProjectWorkspaceProps {
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  onBack?: () => void;
}

type MediaCard = BoardMedia & { url: string };
type View = { x: number; y: number; zoom: number };
type ResizeCorner = "nw" | "ne" | "sw" | "se";
type Gesture = { id?: string; pointerId: number; x: number; y: number; originX: number; originY: number; draw?: boolean; resize?: ResizeCorner; width?: number; height?: number; zoom: number };
const clampZoom = (zoom: number) => Math.min(2.5, Math.max(0.2, zoom));

export function ProjectWorkspace({ clientId = "preview", clientName, projectId = "preview", projectName = "Untitled board", onBack }: ProjectWorkspaceProps) {
  const handleBack = onBack ?? (() => navigate(clientId === "preview" ? "/" : `/project?clientId=${encodeURIComponent(clientId)}`));
  const boardKey = JSON.stringify([clientId, projectId]);
  const [tool, setTool] = useState<WorkspaceTool>(0);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [cards, setCards] = useState<MediaCard[]>([]);
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 });
  // Switch to every second dot below 50%, then every fourth below 25%.
  const gridLevel = Math.max(0, Math.ceil(Math.log2(0.5 / view.zoom)));
  const dotSpacing = 24 * 2 ** gridLevel * view.zoom;
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Loading board…");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const urls = useRef(new Set<string>());
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    const createdUrls = urls.current;
    readBoard(boardKey).then((saved) => {
      if (cancelled) return;
      setCards(saved.map((item) => {
        const url = item.file ? URL.createObjectURL(item.file) : "";
        if (url) createdUrls.add(url);
        return { ...item, url };
      }));
      setReady(true);
      setStatus("Saved in this browser");
    }).catch(() => {
      if (!cancelled) {
        setError("Could not open board storage. Reload this page to try again.");
        setStatus("Storage unavailable");
      }
    });
    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
      createdUrls.clear();
    };
  }, [boardKey]);

  useEffect(() => {
    if (!ready || dragging) return;
    const items: BoardMedia[] = cards.map(({ url, ...item }) => { void url; return item; });
    // Serialize writes so a slower earlier save cannot overwrite the latest layout.
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => writeBoard(boardKey, items));
    let cancelled = false;
    saveQueue.current.then(() => { if (!cancelled) setStatus("Saved in this browser"); })
      .catch(() => { if (!cancelled) setStatus("Not saved — browser storage may be full. Remove an item to retry."); });
    return () => { cancelled = true; };
  }, [boardKey, cards, ready, dragging]);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (gesture.current) return;
      const bounds = element.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      setView((current) => {
        const zoom = clampZoom(current.zoom * Math.exp(-event.deltaY * 0.002));
        return { zoom, x: x - (x - current.x) * zoom / current.zoom, y: y - (y - current.y) * zoom / current.zoom };
      });
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, []);

  const importFiles = (files: File[], point?: { x: number; y: number }) => {
    if (!ready || !viewport.current) return;
    const accepted = files.filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
    setError(accepted.length !== files.length ? "Some files were skipped. Choose images or videos." : "");
    const bounds = viewport.current.getBoundingClientRect();
    const x = ((point?.x ?? bounds.width / 2) - view.x) / view.zoom;
    const y = ((point?.y ?? bounds.height / 2) - view.y) / view.zoom;
    const added: MediaCard[] = accepted.map((file, index) => {
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      return { id: crypto.randomUUID(), name: file.name, kind: file.type.startsWith("video/") ? "video" : "image", file, url,
        x: x - 140 + (index % 3) * 310, y: y - 100 + Math.floor(index / 3) * 290 };
    });
    if (!added.length) return;
    setStatus("Saving…");
    setCards((current) => [...current, ...added]);
    setSelected(added[0].id);
  };

  const chooseMedia = (accept: string) => {
    if (!ready || !fileInput.current) return;
    fileInput.current.accept = accept;
    fileInput.current.click();
  };

  const addText = () => {
    if (!ready || !viewport.current) return;
    const bounds = viewport.current.getBoundingClientRect();
    const id = crypto.randomUUID();
    setCards(current => [...current, { id, kind: "text", name: "Note", title: "", text: "", url: "",
      x: (bounds.width / 2 - view.x) / view.zoom - 140,
      y: (bounds.height / 2 - view.y) / view.zoom - 100, width: 280, height: 220 }]);
    setSelected(id);
    setEditingText(id);
  };

  const removeCard = (id: string) => {
    const card = cards.find((item) => item.id === id);
    if (card) { URL.revokeObjectURL(card.url); urls.current.delete(card.url); }
    setCards((current) => current.filter((item) => item.id !== id));
    setSelected(null);
    setStatus("Saving…");
  };

  const startGesture = (event: ReactPointerEvent<HTMLElement>, card?: MediaCard) => {
    if (event.button !== 0 || gesture.current || !ready) return;
    event.preventDefault();
    event.stopPropagation();
    viewport.current?.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!card && tool !== 0) {
      const bounds = viewport.current!.getBoundingClientRect();
      const x = (event.clientX - bounds.left - view.x) / view.zoom;
      const y = (event.clientY - bounds.top - view.y) / view.zoom;
      const id = crypto.randomUUID();
      const kind = tool === 1 ? "rectangle" : tool === 2 ? "ellipse" : "line";
      setCards(current => [...current, { id, kind, name: kind, url: "", x, y, width: 1, height: 1 }]);
      gesture.current = { id, draw: true, pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: x, originY: y, zoom: view.zoom };
      setSelected(id);
      setEditingText(null);
      setDragging(true);
      return;
    }
    setEditingText(null);
    const bounds = event.currentTarget.getBoundingClientRect();
    const resize = card ? (event.target as HTMLElement).closest<HTMLElement>("[data-resize-corner]")?.dataset.resizeCorner as ResizeCorner | undefined : undefined;
    gesture.current = { id: card?.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      originX: card?.x ?? view.x, originY: card?.y ?? view.y, resize, width: card?.width ?? 280, height: card ? card.height ?? bounds.height / view.zoom : undefined, zoom: view.zoom };
    setSelected(card?.id ?? null);
    setDragging(true);
  };

  const moveGesture = (event: ReactPointerEvent) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (active.draw) {
      const x = dx / active.zoom, y = dy / active.zoom;
      setCards(current => current.map(card => card.id === active.id ? { ...card,
        x: active.originX + Math.min(0, x), y: active.originY + Math.min(0, y),
        width: Math.max(1, Math.abs(x)), height: Math.max(1, Math.abs(y)), flipLine: x * y < 0 } : card));
    } else if (active.id) {
      setCards(current => current.map(card => {
        if (card.id !== active.id) return card;
        if (!active.resize) return { ...card, x: active.originX + dx / active.zoom, y: active.originY + dy / active.zoom };
        const west = active.resize.includes("w");
        const north = active.resize.includes("n");
        const originalWidth = active.width ?? 280;
        const originalHeight = active.height ?? 180;
        const width = Math.max(40, Math.min(4000, originalWidth + (west ? -dx : dx) / active.zoom));
        const height = card.height === undefined
          ? originalHeight * width / originalWidth
          : Math.max(20, Math.min(4000, originalHeight + (north ? -dy : dy) / active.zoom));
        return { ...card, width, height: card.height === undefined ? undefined : height,
          x: active.originX + (west ? originalWidth - width : 0),
          y: active.originY + (north ? originalHeight - height : 0) };
      }));
    } else {
      setView((current) => ({ ...current, x: active.originX + dx, y: active.originY + dy }));
    }
  };

  const endGesture = () => {
    const active = gesture.current;
    if (active?.draw) {
      setCards(current => current.filter(card => card.id !== active.id || (card.width ?? 0) > 3 || (card.height ?? 0) > 3));
      setTool(0);
    }
    gesture.current = null;
    setDragging(false);
  };
  const zoomBy = (factor: number) => {
    const bounds = viewport.current?.getBoundingClientRect();
    if (!bounds) return;
    setView((current) => {
      const zoom = clampZoom(current.zoom * factor);
      return { zoom, x: bounds.width / 2 - (bounds.width / 2 - current.x) * zoom / current.zoom,
        y: bounds.height / 2 - (bounds.height / 2 - current.y) * zoom / current.zoom };
    });
  };

  const fitBoard = () => {
    const bounds = viewport.current?.getBoundingClientRect();
    if (!bounds || !cards.length) { setView({ x: 0, y: 0, zoom: 1 }); return; }
    const left = Math.min(...cards.map((card) => card.x));
    const top = Math.min(...cards.map((card) => card.y));
    const width = Math.max(...cards.map((card) => card.x + (card.width ?? 280))) - left;
    const height = Math.max(...cards.map((card) => {
      const element = viewport.current?.querySelector<HTMLElement>(`[data-media-id="${card.id}"]`);
      return card.y + (element?.offsetHeight || 180);
    })) - top;
    const zoom = clampZoom(Math.min((bounds.width - 120) / width, (bounds.height - 120) / height, 1));
    setView({ zoom, x: (bounds.width - width * zoom) / 2 - left * zoom, y: (bounds.height - height * zoom) / 2 - top * zoom });
  };

  return (
    <section aria-label={projectName} className="relative h-dvh w-full overflow-hidden bg-background">
      <ProjectInfo clientName={clientName} projectName={projectName} onBack={handleBack} />
      <ToolBar selectedTool={tool} onToolChange={setTool} disabled={!ready} canDelete={cards.some(card => card.id === selected)}
        onTextClick={addText} onImageClick={() => chooseMedia("image/*")} onVideoClick={() => chooseMedia("video/*")}
        onDeleteClick={() => { if (selected) removeCard(selected); }} />
      <span role="status" className="sr-only">{status}</span>
      <input ref={fileInput} type="file" accept="image/*,video/*" multiple className="hidden" aria-label="Import media"
        onChange={(event) => { importFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
      {error && <p role="alert" onClick={() => setError("")} className="absolute left-4 top-4 z-50 max-w-md bg-background p-3 text-sm text-error">{error}</p>}
      <div ref={viewport} tabIndex={0} aria-label="Canvas. Drop or paste media. Drag to move; drag any corner to resize."
        className={`absolute inset-0 overflow-hidden outline-none ${tool !== 0 ? "cursor-crosshair" : dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ touchAction: "none", backgroundImage: "radial-gradient(circle, var(--border-strong) 1px, transparent 1px)",
          backgroundSize: `${dotSpacing}px ${dotSpacing}px`, backgroundPosition: `${view.x - dotSpacing / 2}px ${view.y - dotSpacing / 2}px` }}
        onPointerDown={(event) => startGesture(event)} onPointerMove={moveGesture}
        onPointerUp={endGesture} onPointerCancel={endGesture} onLostPointerCapture={endGesture}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
        onDrop={(event) => { event.preventDefault(); const bounds = event.currentTarget.getBoundingClientRect();
          importFiles(Array.from(event.dataTransfer.files), { x: event.clientX - bounds.left, y: event.clientY - bounds.top }); }}
        onPaste={(event) => {
          const files = Array.from(event.clipboardData.files);
          if (files.length) { event.preventDefault(); importFiles(files); }
        }}
        onKeyDown={(event) => {
          if ((event.target as HTMLElement).closest("video, input, textarea, [contenteditable=true]")) return;
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") {
            event.preventDefault(); chooseMedia("image/*,video/*"); return;
          }
          if (event.key === "Escape") { if (tool !== 0) { setTool(0); return; } if (selected) setSelected(null); else handleBack(); return; }
          if ((event.key === "Delete" || event.key === "Backspace") && selected) { event.preventDefault(); removeCard(selected); return; }
          if (event.key === "f" || event.key === "F") { fitBoard(); return; }
          if (event.key === "+" || event.key === "=" || event.key === "-") {
            event.preventDefault();
            const factor = event.key === "-" ? 1 / 1.1 : 1.1;
            if (selected) setCards((current) => current.map((card) => card.id === selected
              ? { ...card, width: Math.max(40, Math.min(4000, (card.width ?? 280) * factor)) } : card));
            else zoomBy(factor);
          }
          const offset = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[event.key];
          if (offset) {
            event.preventDefault();
            if (selected) setCards((current) => current.map((card) => card.id === selected ? { ...card, x: card.x + offset[0], y: card.y + offset[1] } : card));
            else setView((current) => ({ ...current, x: current.x - offset[0], y: current.y - offset[1] }));
          }
        }}>
        <div className="absolute left-0 top-0" style={{ transformOrigin: "0 0", transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
          {cards.map((card) => (
            <div key={card.id} data-media-id={card.id}
              className="absolute select-none"
              style={{ left: card.x, top: card.y, width: card.width ?? 280, height: card.height, zIndex: selected === card.id ? 2 : 1,
                outline: selected === card.id ? `${2 / view.zoom}px solid var(--primary)` : undefined }}
              onPointerDown={(event) => startGesture(event, card)}
              onPointerMove={(event) => {
                if (gesture.current) return;
                const corner = (event.target as HTMLElement).closest<HTMLElement>("[data-resize-corner]")?.dataset.resizeCorner;
                event.currentTarget.style.cursor = corner ? (corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize") : "move";
              }}>
              {(card.kind === "rectangle" || card.kind === "ellipse" || card.kind === "line") && (
                <span aria-hidden="true" className="absolute -inset-[20px]" />
              )}
              {card.kind === "text" ? (
                <div className="h-full overflow-hidden rounded-lg border border-border bg-surface text-text-primary shadow-md">
                  <div className="h-5 cursor-move border-b border-border bg-primary/20" title="Drag note" />
                  <div className="flex h-[calc(100%-20px)] flex-col gap-2 p-4" onPointerDown={event => { event.stopPropagation(); setSelected(card.id); }}>
                    <input aria-label="Note title" placeholder="Title" value={card.title ?? ""} className="w-full bg-transparent font-semibold outline-none"
                      onChange={event => setCards(current => current.map(item => item.id === card.id ? { ...item, title: event.target.value } : item))} />
                    <textarea aria-label="Note text" placeholder="Start writing?" autoFocus={editingText === card.id} value={card.text ?? ""}
                      className="min-h-0 w-full flex-1 resize-none bg-transparent text-sm outline-none"
                      onChange={event => setCards(current => current.map(item => item.id === card.id ? { ...item, text: event.target.value } : item))} />
                  </div>
                </div>
              ) : card.kind === "rectangle" || card.kind === "ellipse" ? (
                <svg width="100%" height="100%" className="pointer-events-none overflow-visible text-text-primary"
                  fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
                  {card.kind === "rectangle"
                    ? <rect width="100%" height="100%" />
                    : <ellipse cx="50%" cy="50%" rx="50%" ry="50%" />}
                </svg>
              ) : card.kind === "line" ? (
                <svg width="100%" height="100%" className="pointer-events-none overflow-visible text-text-primary"
                  fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
                  <line x1="0" y1={card.flipLine ? "100%" : "0"} x2="100%" y2={card.flipLine ? "0" : "100%"} />
                </svg>
              ) : card.kind === "image"
                ? <img src={card.url} alt={card.name} draggable={false} className="pointer-events-none block h-auto w-full"
                    onError={() => setError(`Could not display ${card.name}. Try a supported image format.`)} />
                : <video src={card.url} aria-label={card.name} controls playsInline loop preload="metadata" className="block h-auto w-full cursor-default"
                    onFocus={() => setSelected(card.id)}
                    onPointerDown={(event) => {
                      setSelected(card.id);
                      // Alt-drag moves the video; ordinary clicks belong to native controls.
                      if (!event.altKey) event.stopPropagation();
                    }}
                    onError={() => setError(`Could not play ${card.name}. Try a supported MP4 or WebM.`)} />}
              {selected === card.id && (["nw", "ne", "sw", "se"] as const).map(corner => (
                <span key={corner} data-resize-corner={corner} aria-hidden="true"
                  className="absolute z-10 h-3 w-3 border border-primary bg-surface"
                  style={{
                    top: corner.includes("n") ? -6 : undefined,
                    bottom: corner.includes("s") ? -6 : undefined,
                    left: corner.includes("w") ? -6 : undefined,
                    right: corner.includes("e") ? -6 : undefined,
                    cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                  }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div role="group" aria-label="Canvas zoom" className="absolute bottom-5 right-5 z-10 flex items-center gap-1 rounded-xl border border-border bg-card p-1 text-text-primary shadow-lg">
        <button type="button" aria-label="Zoom out" className="rounded-lg p-3 hover:bg-button-hover" onClick={() => zoomBy(1 / 1.2)}><FiMinus /></button>
        <span className="w-12 text-center text-xs tabular-nums">{Math.round(view.zoom * 100)}%</span>
        <button type="button" aria-label="Zoom in" className="rounded-lg p-3 hover:bg-button-hover" onClick={() => zoomBy(1.2)}><FiPlus /></button>
        <button type="button" aria-label="Fit board to screen" title="Fit board to screen" className="rounded-lg border-l border-border p-3 hover:bg-button-hover" onClick={fitBoard}><FiMaximize /></button>
      </div>
    </section>
  );
}

export default ProjectWorkspace;

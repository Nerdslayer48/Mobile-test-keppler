import { useUndoState } from "../../hooks/useUndoState";
import { CardInputBox } from "../00_UiComps/CardInputBox";
import { CardNodes } from "../00_UiComps/CardNodes";
import type { CardSide } from "../00_UiComps/CardNodes";
import { navigate } from "../../navigation";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { FiMinus, FiPlus, FiMaximize, FiLoader, FiAlertCircle } from "react-icons/fi";
import { readBoard, writeBoard } from "../../types/workspaceStorage";
import type { BoardMedia } from "../../types/workspaceStorage";
import { companyId } from "../../types/companyAuth";
import { ProjectInfo } from "../03_PopUps/ProjectInfo";
import type { WorkspaceTool } from "../03_PopUps/ToolBar";
import { Button } from "../00_UiComps/Button";
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
type Gesture = { id?: string; group?: { id: string; x: number; y: number }[]; pointerId: number; x: number; y: number; originX: number; originY: number; selecting?: boolean; draw?: boolean; resize?: ResizeCorner; width?: number; height?: number; zoom: number };
const clampZoom = (zoom: number) => Math.min(5.5, Math.max(0.04, zoom));

export function ProjectWorkspace({ clientId = "preview", clientName, projectId = "preview", projectName = "Untitled board", onBack }: ProjectWorkspaceProps) {
  const handleBack = onBack ?? (() => navigate(clientId === "preview" ? "/" : `/project?clientId=${encodeURIComponent(clientId)}`));
  const boardKey = JSON.stringify([companyId(), clientId, projectId]);
  const [selectedInput, setSelectedInput] = useState<string | null>(null);
  const [tool, setTool] = useState<WorkspaceTool>(0);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);
  const [connectionSide, setConnectionSide] = useState<CardSide>("right");
  const [cardHeights, setCardHeights] = useState<Record<string, number>>({});
  const [connectionPoint, setConnectionPoint] = useState<{ x: number; y: number } | null>(null);
  const mediaTarget = useRef<{ cardId: string; inputId: string } | null>(null);
  const [editingText, setEditingText] = useState<string | null>(null);
  const { value: cards, set: setCards, reset: resetCards, undo, redo, begin: beginHistory, end: endHistory } = useUndoState<MediaCard[]>([]);
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 });
  // Switch to every second dot below 50%, then every fourth below 25%.
  const gridLevel = Math.max(0, Math.ceil(Math.log2(0.5 / view.zoom)));
  const dotSpacing = 24 * 2 ** gridLevel * view.zoom;
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadSlow, setLoadSlow] = useState(false);
  const [loadRetry, setLoadRetry] = useState(0);
  const [saveRetry, setSaveRetry] = useState(0);
  const [status, setStatus] = useState("Loading board…");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [actionCursor, setActionCursor] = useState("default");
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const urls = useRef(new Set<string>());
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    const createdUrls = urls.current;
    if (ready) return;
    const controller = new AbortController();
    setLoadFailed(false);
    setLoadSlow(false);
    const slowTimer = window.setTimeout(() => setLoadSlow(true), 8000);
    readBoard(boardKey, controller.signal).then((saved) => {
      if (cancelled) return;
      resetCards(saved.map((item) => {
        const url = item.file ? URL.createObjectURL(item.file) : "";
        if (url) createdUrls.add(url);
        const inputs = item.kind === "text" ? (item.inputs ?? [{ id: crypto.randomUUID(), text: item.text ?? "" }]).map(input => ({
          ...input, media: input.media?.map(media => {
            const url = URL.createObjectURL(media.file);
            createdUrls.add(url);
            return { ...media, url };
          }),
        })) : item.inputs;
        return { ...item, inputs, url };
      }));
      setError("");
      setReady(true);
      setStatus("Saved online");
    }).catch(() => {
      if (!cancelled) {
        setLoadFailed(true);
        setStatus("Storage unavailable");
      }
    }).finally(() => window.clearTimeout(slowTimer));
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(slowTimer);
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
      createdUrls.clear();
    };
  }, [boardKey, resetCards, loadRetry]);

  useEffect(() => {
    if (!ready || dragging) return;
    const items: BoardMedia[] = cards.map(({ url, ...item }) => { void url; return { ...item, inputs: item.inputs?.map(input => ({ ...input, media: input.media?.map(({ url, ...media }) => { void url; return media; }) })) }; });
    // Serialize writes so a slower earlier save cannot overwrite the latest layout.
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => writeBoard(boardKey, items));
    let cancelled = false;
    saveQueue.current.then(() => { if (!cancelled) setStatus("Saved online"); })
      .catch(() => { if (!cancelled) setStatus("Not saved. Check your connection or reopen the board if it changed on another device."); });
    return () => { cancelled = true; };
  }, [boardKey, cards, ready, dragging, saveRetry]);

  useEffect(() => {
    const retry = () => {
      if (!ready && loadFailed) setLoadRetry(value => value + 1);
      else if (status.startsWith("Not saved")) setSaveRetry(value => value + 1);
    };
    const timer = window.setInterval(retry, 15000);
    window.addEventListener("online", retry);
    return () => { window.clearInterval(timer); window.removeEventListener("online", retry); };
  }, [ready, status, loadFailed]);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (gesture.current) return;
      const bounds = element.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? bounds.height : 1;
      const delta = Math.max(-120, Math.min(120, event.deltaY * unit));
      setView((current) => {
        const nextZoom = current.zoom * Math.exp(-delta * 0.004);
        const zoom = clampZoom(delta > 0 && nextZoom < 0.045 ? 0.04 : nextZoom);
        if (zoom === current.zoom) return current;
        return { zoom, x: x - (x - current.x) * zoom / current.zoom, y: y - (y - current.y) * zoom / current.zoom };
      });
    };
    element.addEventListener("wheel", wheel, { passive: false, capture: true });
    return () => element.removeEventListener("wheel", wheel, true);
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      setCardHeights(current => {
        const next = { ...current };
        let changed = false;
        entries.forEach(entry => {
          const element = entry.target as HTMLElement;
          const id = element.dataset.mediaId!;
          if (next[id] !== element.offsetHeight) { next[id] = element.offsetHeight; changed = true; }
        });
        return changed ? next : current;
      });
    });
    viewport.current?.querySelectorAll("[data-media-id]").forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [cards]);

  const importFiles = (files: File[], point?: { x: number; y: number }) => {
    if (!ready || !viewport.current) return;
    const accepted = files.filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
    setError(accepted.length !== files.length ? "Some files were skipped. Choose images or videos." : "");
    const target = mediaTarget.current;
    mediaTarget.current = null;
    if (target) {
      const media = accepted.map(file => {
        const url = URL.createObjectURL(file);
        urls.current.add(url);
        return { id: crypto.randomUUID(), name: file.name, kind: file.type.startsWith("video/") ? "video" as const : "image" as const, file, url };
      });
      setCards(current => current.map(card => card.id === target.cardId ? { ...card, inputs: card.inputs?.map(input => input.id === target.inputId ? { ...input, media: [...(input.media ?? []), ...media] } : input) } : card));
      return;
    }
    const bounds = viewport.current.getBoundingClientRect();
    const x = ((point?.x ?? bounds.width / 2) - view.x) / view.zoom;
    const y = ((point?.y ?? bounds.height / 2) - view.y) / view.zoom;
    const added: MediaCard[] = accepted.map((file, index) => {
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      return { id: crypto.randomUUID(), name: file.name, kind: file.type.startsWith("video/") ? "video" : "image", file, url, width: 340,
        x: x - 170 + (index % 3) * 370, y: y - 100 + Math.floor(index / 3) * 330 };
    });
    if (!added.length) return;
    setStatus("Saving…");
    setCards((current) => [...current, ...added]);
    setSelected(added[0].id);
  };

  const chooseMedia = (accept: string, target?: { cardId: string; inputId: string }) => {
    if (!ready || !fileInput.current) return;
    mediaTarget.current = target ?? null;
    fileInput.current.accept = accept;
    fileInput.current.click();
  };

  const addText = () => {
    if (!ready || !viewport.current) return;
    const bounds = viewport.current.getBoundingClientRect();
    const id = crypto.randomUUID();
    setCards(current => [...current, { id, kind: "text", name: "Note", title: "New Card", inputs: [{ id: crypto.randomUUID(), text: "" }], url: "",
      x: (bounds.width / 2 - view.x) / view.zoom - 140,
      y: (bounds.height / 2 - view.y) / view.zoom - 100, width: 340 }]);
    setSelected(id);
    setEditingText(id);
  };

  const removeCard = (id: string) => {
    // Keep media URLs alive for undo; release them when the workspace unmounts.
    setConnectionSource(null);
    setCards((current) => current.filter((item) => item.id !== id).map(item => ({ ...item, connections: item.connections?.filter(target => target !== id) })));
    setSelected(null);
    setSelectedInput(null);
    setStatus("Saving…");
  };

  const deleteSelection = () => {
    if (selectedIds.length) {
      const removed = new Set(selectedIds);
      setCards(current => current.filter(card => !removed.has(card.id)).map(card => ({ ...card,
        connections: card.connections?.filter(id => !removed.has(id)) })));
      setSelectedIds([]);
      setSelected(null);
      setConnectionSource(null);
      setConnectionPoint(null);
      return;
    }
    const card = cards.find(item => item.id === selected);
    if (card && selectedInput && card.inputs?.some(input => input.id === selectedInput)) {
      setCards(current => current.map(item => item.id === card.id ? { ...item, inputs: item.inputs?.filter(input => input.id !== selectedInput) } : item));
      setSelectedInput(null);
    } else if (selected) removeCard(selected);
  };

  const connectCard = (target: string, side: CardSide) => {
    if (!connectionSource || connectionSource === target) return;
    setCards(current => current.map(card => card.id === connectionSource
      ? { ...card, connections: [...new Set([...(card.connections ?? []), target])], connectionPorts: { ...card.connectionPorts, [target]: { source: connectionSide, target: side } } } : card));
    setConnectionSource(null);
    setConnectionPoint(null);
  };
  const nodePoint = (card: MediaCard, side: CardSide) => {
    const width = card.width ?? 280, height = cardHeights[card.id] ?? card.height ?? 180;
    return { x: card.x + (side === "left" ? 0 : side === "right" ? width : width / 2),
      y: card.y + (side === "top" ? 0 : side === "bottom" ? height : height / 2) };
  };
  const connectionPath = (source: MediaCard, sourceSide: CardSide, target: { x: number; y: number }, targetSide: CardSide = "left") => {
    const start = nodePoint(source, sourceSide);
    const directions = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
    const bend = Math.max(80, Math.hypot(target.x - start.x, target.y - start.y) / 2);
    const from = directions[sourceSide], to = directions[targetSide];
    return `M ${start.x} ${start.y} C ${start.x + from[0] * bend} ${start.y + from[1] * bend}, ${target.x + to[0] * bend} ${target.y + to[1] * bend}, ${target.x} ${target.y}`;
  };
  const startConnection = (card: MediaCard, side: CardSide) => {
    if (connectionSource && connectionSource !== card.id) { connectCard(card.id, side); return; }
    setConnectionSource(card.id);
    setConnectionSide(side);
    setConnectionPoint(nodePoint(card, side));
  };

  const itemsMovingWith = (ids: string[], items = cards) => {
    const moving = new Set(ids);
    const sections = items.filter(item => moving.has(item.id) && item.kind === "section");
    for (const section of sections) {
      const right = section.x + (section.width ?? 280);
      const bottom = section.y + (section.height ?? cardHeights[section.id] ?? 180);
      for (const item of items) {
        if (moving.has(item.id)) continue;
        const height = cardHeights[item.id] ?? item.height ?? 180;
        if (item.x >= section.x && item.y >= section.y && item.x + (item.width ?? 280) <= right && item.y + height <= bottom) {
          moving.add(item.id);
          if (item.kind === "section") sections.push(item);
        }
      }
    }
    return items.filter(item => moving.has(item.id));
  };

  const startGesture = (event: ReactPointerEvent<HTMLElement>, card?: MediaCard) => {
    if (connectionSource) { setConnectionSource(null); setConnectionPoint(null); return; }
    if ((event.button !== 0 && event.button !== 1) || gesture.current || !ready) return;
    const sectionInterior = card?.kind === "section" && selected !== card.id && !(event.target as HTMLElement).closest("[data-resize-corner], input") && tool === 0;
    if (event.button === 0 && (!card || sectionInterior) && tool === 0) {
      event.preventDefault();
      event.stopPropagation();
      const bounds = viewport.current!.getBoundingClientRect();
      const x = (event.clientX - bounds.left - view.x) / view.zoom;
      const y = (event.clientY - bounds.top - view.y) / view.zoom;
      event.currentTarget.setPointerCapture(event.pointerId);
      gesture.current = { selecting: true, pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: x, originY: y, zoom: view.zoom };
      setSelectedIds([]);
      setSelectionBox({ x, y, width: 0, height: 0 });
      setSelected(null);
      setSelectedInput(null);
      setEditingText(null);
      viewport.current?.focus();
      return;
    }
    if (event.button === 0) setSelectedIds([]);
    if (card && card.kind !== "text" && selected !== card.id) {
      event.preventDefault();
      event.stopPropagation();
      setSelected(null);
      return;
    }
    beginHistory();
    setSelectedInput(null);
    event.preventDefault();
    event.stopPropagation();
    viewport.current?.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.button === 0 && !card && tool !== 0) {
      const bounds = viewport.current!.getBoundingClientRect();
      const x = (event.clientX - bounds.left - view.x) / view.zoom;
      const y = (event.clientY - bounds.top - view.y) / view.zoom;
      const id = crypto.randomUUID();
      const kind = tool === 1 ? "rectangle" : tool === 2 ? "ellipse" : tool === 3 ? "section" : "line";
      setCards(current => [...current, { id, kind, name: kind === "section" ? "New section" : kind, url: "", x, y, width: 1, height: 1 }]);
      gesture.current = { id, draw: true, pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: x, originY: y, zoom: view.zoom };
      setSelected(id);
      setEditingText(null);
      setDragging(true);
      setActionCursor("crosshair");
      return;
    }
    setEditingText(null);
    const bounds = event.currentTarget.getBoundingClientRect();
    const resize = card ? (event.target as HTMLElement).closest<HTMLElement>("[data-resize-corner]")?.dataset.resizeCorner as ResizeCorner | undefined : undefined;
    gesture.current = { id: card?.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      group: card?.kind === "section" && !resize ? itemsMovingWith([card.id]).map(item => ({ id: item.id, x: item.x, y: item.y })) : undefined,
      originX: card?.x ?? view.x, originY: card?.y ?? view.y, resize, width: card?.width ?? 280, height: card ? card.height ?? bounds.height / view.zoom : undefined, zoom: view.zoom };
    setSelected(card?.id ?? null);
    setDragging(true);
    setActionCursor(resize ? (resize === "nw" || resize === "se" ? "nwse-resize" : "nesw-resize") : "grabbing");
  };

  const moveGesture = (event: ReactPointerEvent) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (active.group) {
      const origins = new Map(active.group.map(item => [item.id, item]));
      setCards(current => current.map(card => {
        const origin = origins.get(card.id);
        return origin ? { ...card, x: origin.x + dx / active.zoom, y: origin.y + dy / active.zoom } : card;
      }));
      return;
    }
    if (active.selecting) {
      const dxWorld = dx / active.zoom, dyWorld = dy / active.zoom;
      const box = { x: active.originX + Math.min(0, dxWorld), y: active.originY + Math.min(0, dyWorld), width: Math.abs(dxWorld), height: Math.abs(dyWorld) };
      setSelectionBox(box);
      setSelectedIds(box.width < 3 && box.height < 3 ? [] : cards.filter(card => {
        if (card.kind !== "text" && card.kind !== "image" && card.kind !== "video") return false;
        const width = card.width ?? 280, height = cardHeights[card.id] ?? card.height ?? 180;
        return card.x < box.x + box.width && card.x + width > box.x && card.y < box.y + box.height && card.y + height > box.y;
      }).map(card => card.id));
      return;
    }
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
        const isShape = card.kind === "rectangle" || card.kind === "ellipse" || card.kind === "line" || card.kind === "section";
        const width = Math.max(40, Math.min(isShape ? Infinity : 4000, originalWidth + (west ? -dx : dx) / active.zoom));
        const height = card.height === undefined
          ? originalHeight * width / originalWidth
          : Math.max(20, Math.min(isShape ? Infinity : 4000, originalHeight + (north ? -dy : dy) / active.zoom));
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
    setSelectionBox(null);
    if (active?.draw) {
      setCards(current => current.filter(card => card.id !== active.id || (card.width ?? 0) > 3 || (card.height ?? 0) > 3));
      setTool(0);
      setSelected(null);
    }
    gesture.current = null;
    endHistory();
    setDragging(false);
    setActionCursor("default");
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

  const groupItems = cards.filter(card => selectedIds.includes(card.id));
  const groupBounds = groupItems.length ? (() => {
    const x = Math.min(...groupItems.map(card => card.x));
    const y = Math.min(...groupItems.map(card => card.y));
    return { x: x - 20, y: y - 20,
      width: Math.max(...groupItems.map(card => card.x + (card.width ?? 280))) - x + 40,
      height: Math.max(...groupItems.map(card => card.y + (cardHeights[card.id] ?? card.height ?? 180))) - y + 40 };
  })() : null;
  const startGroupMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || gesture.current || !ready || !groupBounds || event.shiftKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault(); event.stopPropagation();
    viewport.current?.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    beginHistory();
    gesture.current = { group: itemsMovingWith(selectedIds).map(card => ({ id: card.id, x: card.x, y: card.y })),
      pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: groupBounds.x, originY: groupBounds.y, zoom: view.zoom };
    setDragging(true);
    setActionCursor("grabbing");
  };

  return (
    <section onKeyDownCapture={event => {
      if (!(event.ctrlKey || event.metaKey) || gesture.current) return;
      const key = event.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      event.preventDefault(); event.stopPropagation();
      if (key === "y" || event.shiftKey) redo(); else undo();
    }} aria-label={projectName} aria-busy={!ready && !loadFailed} className="relative h-screen w-full min-w-[1440px] overflow-hidden bg-background">
      <ProjectInfo clientName={clientName} projectName={projectName} onBack={handleBack} />
      <ToolBar selectedTool={tool} onToolChange={setTool} disabled={!ready} canDelete={selectedIds.length > 0 || cards.some(card => card.id === selected)}
        onNewCardClick={addText} onUploadMediaClick={() => chooseMedia("image/*,video/*")}
        onDeleteClick={deleteSelection} />
      {!ready && <div className="absolute inset-0 z-40 flex items-center justify-center bg-background px-6">
        <div role={loadFailed ? "alert" : "status"} aria-label={loadFailed ? "Moodboard loading failed" : "Loading moodboard"}
          className="w-full max-w-[420px] rounded-2xl border border-border bg-surface px-8 py-9 text-center font-montserrat text-text-primary shadow-lg">
          <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${loadFailed ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>
            {loadFailed ? <FiAlertCircle size={26} aria-hidden="true" /> : <FiLoader size={26} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          </div>
          <h2 className="text-lg font-semibold">{loadFailed ? "Could not open this moodboard" : "Opening your moodboard"}</h2>
          <p className="mt-2 truncate text-sm font-medium text-text-secondary" title={projectName}>{projectName}</p>
          <p className="mt-4 text-sm leading-relaxed text-text-muted">{loadFailed ? "Your board has not loaded yet. Check your connection and try again." : loadSlow ? "Still loading. A slow connection can take a little longer." : "Loading your cards, sections, and media..."}</p>
          {loadFailed && <div className="mt-6 flex justify-center gap-3"><Button onClick={() => setLoadRetry(value => value + 1)}>Try again</Button><Button variant="secondary" onClick={handleBack}>Back to projects</Button></div>}
        </div>
      </div>}
      <span role="status" className="sr-only">{status}</span>
      <input ref={fileInput} type="file" accept="image/*,video/*" multiple className="hidden" aria-label="Import media"
        onChange={(event) => { importFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
      {error && <p role="alert" onClick={() => setError("")} className="absolute left-4 top-4 z-50 max-w-md bg-background p-3 text-sm text-error">{error}</p>}
      <div ref={viewport} tabIndex={0} aria-label="Canvas. Drop or paste media. Drag to move; drag any corner to resize."
        className="absolute inset-0 overflow-hidden outline-none"
        style={{ touchAction: "none", cursor: connectionSource || (tool === 3 && !dragging) ? "crosshair" : actionCursor, backgroundImage: "radial-gradient(circle, color-mix(in srgb, var(--border-strong) 40%, transparent) 1px, transparent 1px)",
          backgroundSize: `${dotSpacing}px ${dotSpacing}px`, backgroundPosition: `${view.x - dotSpacing / 2}px ${view.y - dotSpacing / 2}px` }}
        onPointerDownCapture={event => { if (event.button === 1) startGesture(event); }}
        onAuxClick={event => { if (event.button === 1) event.preventDefault(); }}
        onPointerDown={(event) => startGesture(event)} onPointerMove={event => {
          moveGesture(event);
          if (connectionSource) {
            const bounds = event.currentTarget.getBoundingClientRect();
            setConnectionPoint({ x: (event.clientX - bounds.left - view.x) / view.zoom, y: (event.clientY - bounds.top - view.y) / view.zoom });
          }
        }}
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
          if (event.key === "Escape") { if (selectedIds.length) { setSelectedIds([]); return; } if (connectionSource) { setConnectionSource(null); setConnectionPoint(null); return; } if (tool !== 0) { setTool(0); return; } if (selected) setSelected(null); else handleBack(); return; }
          if ((event.key === "Delete" || event.key === "Backspace") && (selected || selectedIds.length)) { event.preventDefault(); deleteSelection(); return; }
          if (event.key === "f" || event.key === "F") { fitBoard(); return; }
          if (event.key === "+" || event.key === "=" || event.key === "-") {
            event.preventDefault();
            const factor = event.key === "-" ? 1 / 1.1 : 1.1;
            if (selected) setCards((current) => current.map((card) => card.id === selected
              ? { ...card, width: Math.max(40, Math.min(card.kind === "rectangle" || card.kind === "ellipse" || card.kind === "line" || card.kind === "section" ? Infinity : 4000, (card.width ?? 280) * factor)) } : card));
            else zoomBy(factor);
          }
          const offset = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[event.key];
          if (offset) {
            event.preventDefault();
            if (selected || selectedIds.length) setCards(current => {
              const moving = new Set(itemsMovingWith(selectedIds.length ? selectedIds : [selected!], current).map(item => item.id));
              return current.map(card => moving.has(card.id) ? { ...card, x: card.x + offset[0], y: card.y + offset[1] } : card);
            });
            else setView((current) => ({ ...current, x: current.x - offset[0], y: current.y - offset[1] }));
          }
        }}>
        <div className="absolute left-0 top-0" style={{ transformOrigin: "0 0", transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
          <svg className="pointer-events-none absolute left-0 top-0 z-[3] overflow-visible" width="1" height="1">
            {cards.flatMap(source => (source.connections ?? []).map(targetId => {
              const target = cards.find(card => card.id === targetId);
              return target ? <path key={`${source.id}-${target.id}`} d={connectionPath(source, source.connectionPorts?.[targetId]?.source ?? "right", nodePoint(target, source.connectionPorts?.[targetId]?.target ?? "left"), source.connectionPorts?.[targetId]?.target ?? "left")} fill="none" stroke="var(--secondary)" strokeWidth={2 / view.zoom} /> : null;
            }))}
            {connectionSource && connectionPoint && cards.filter(card => card.id === connectionSource).map(card => <path key="preview" d={connectionPath(card, connectionSide, connectionPoint)} fill="none" stroke="var(--primary)" strokeWidth={2 / view.zoom} strokeDasharray="6 4" />)}
          </svg>
          {cards.map((card) => (
            <div key={card.id} data-media-id={card.id}
              className="group/card absolute select-none"
              style={{ left: card.x, top: card.y, width: card.width ?? 280, height: card.kind === "text" ? undefined : card.height,
                zIndex: card.kind === "section" ? 0 : card.kind === "rectangle" || card.kind === "ellipse" ? (selected === card.id ? 2 : 1) : (selected === card.id ? 5 : 4),
                borderRadius: card.kind === "text" ? 8 : undefined,
                outline: selected === card.id && !(card.kind === "text" && selectedInput) ? `${2 / view.zoom}px solid var(--primary)` : undefined }}
              onPointerDown={(event) => startGesture(event, card)}
              onPointerDownCapture={event => {
                if (selectedIds.includes(card.id) && !(event.shiftKey || event.ctrlKey || event.metaKey)) {
                  startGroupMove(event);
                  return;
                }
                if (event.button !== 0 || !(event.shiftKey || event.ctrlKey || event.metaKey) || !ready || gesture.current) return;
                event.preventDefault();
                event.stopPropagation();
                const ids = new Set(selectedIds);
                if (selected) ids.add(selected);
                if (ids.has(card.id)) ids.delete(card.id); else ids.add(card.id);
                setSelectedIds([...ids]);
                setSelected(null);
                setSelectedInput(null);
                setEditingText(null);
                viewport.current?.focus();
              }}
              onDoubleClick={event => {
                if (!ready || card.kind === "text") return;
                event.preventDefault();
                event.stopPropagation();
                setSelected(card.id);
                setSelectedIds([]);
                setSelectedInput(null);
              }}>
              {(card.kind === "rectangle" || card.kind === "ellipse" || card.kind === "line") && (
                <span aria-hidden="true" className="absolute -inset-[20px]" />
              )}
              {card.kind === "section" ? (
                <>
                  <div className="h-full w-full border border-button-border bg-button-bg"
                    style={{ borderWidth: 1 / view.zoom, borderRadius: 8 / view.zoom }} />
                  <input aria-label="Section name" value={card.name} placeholder="New section"
                    className="absolute bottom-full left-0 w-fit [field-sizing:content] rounded border border-button-border bg-button-bg px-[8px] py-[4px] text-center font-montserrat text-[16px] font-bold text-button-text outline-none focus:border-primary"
                    style={{ marginBottom: 8 / view.zoom, scale: 1 / view.zoom, transformOrigin: "bottom left" }}
                    onPointerDown={event => event.stopPropagation()}
                    onDoubleClick={event => event.stopPropagation()}
                    onChange={event => setCards(current => current.map(item => item.id === card.id ? { ...item, name: event.target.value } : item))} />
                </>
              ) : card.kind === "text" ? (
                <div className="min-h-full min-w-0 rounded-[8px] border border-border bg-card px-5 pb-5 text-text-primary">
                  <div className="relative flex justify-center py-6" title="Drag card">
                    <input aria-label="Card title" value={card.title ?? "New Card"} style={{ width: `${Math.max((card.title ?? "New Card").length, 1)}ch` }} className="max-w-full cursor-text border-0 bg-transparent text-center font-montserrat text-[24px] font-bold outline-none"
                      onPointerDown={event => { event.stopPropagation(); setSelected(card.id); setSelectedInput(null); }}
                      onChange={event => setCards(current => current.map(item => item.id === card.id ? { ...item, title: event.target.value } : item))} />
                  </div>
                  <div className="flex flex-col gap-2" onPointerDown={event => { event.stopPropagation(); setSelected(card.id); }}>
                    {card.inputs?.map((input, index) => <CardInputBox key={input.id} input={input} index={index}
                      selected={selected === card.id && selectedInput === input.id} first={index === 0} last={index === (card.inputs?.length ?? 0) - 1}
                      autoFocus={editingText === card.id && index === 0}
                      onSelect={() => { setSelectedIds([]); setSelected(card.id); setSelectedInput(input.id); }}
                      onChange={box => setCards(current => current.map(item => item.id === card.id ? { ...item, inputs: item.inputs?.map(existing => existing.id === box.id ? box : existing) } : item))}
                      onReorder={offset => setCards(current => current.map(item => {
                        if (item.id !== card.id) return item;
                        const inputs = [...(item.inputs ?? [])];
                        const position = inputs.findIndex(box => box.id === input.id), target = position + offset;
                        if (position < 0 || target < 0 || target >= inputs.length) return item;
                        [inputs[position], inputs[target]] = [inputs[target], inputs[position]];
                        return { ...item, inputs };
                      }))}
                      onDuplicate={targetId => {
                        if (targetId === card.id || !cards.some(item => item.id === targetId && item.kind === "text")) return;
                        const copy = { ...input, id: crypto.randomUUID(), media: input.media?.map(media => {
                          const url = URL.createObjectURL(media.file);
                          urls.current.add(url);
                          return { ...media, id: crypto.randomUUID(), url };
                        }) };
                        setCards(current => current.map(item => item.id === targetId ? { ...item, inputs: [...(item.inputs ?? []), copy] } : item));
                        setSelected(targetId); setSelectedInput(copy.id);
                      }}
                      onMedia={files => {
                        const target = { cardId: card.id, inputId: input.id };
                        if (files) { mediaTarget.current = target; importFiles(files); }
                        else chooseMedia("image/*,video/*", target);
                      }} />)}
                    <button type="button" aria-label="Add input box" title="Add input box" className="self-center rounded p-1 text-text-muted hover:bg-button-bg hover:text-text-primary"
                      onClick={() => setCards(current => current.map(item => item.id === card.id ? { ...item, inputs: [...(item.inputs ?? []), { id: crypto.randomUUID(), text: "" }] } : item))}><FiPlus size={14} /></button>
                  </div>
                </div>
              ) : card.kind === "rectangle" || card.kind === "ellipse" ? (
                <svg width="100%" height="100%" className="pointer-events-none overflow-visible text-text-primary"
                  fill="var(--background)" stroke={selected === card.id ? "var(--primary)" : "currentColor"} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
                  {card.kind === "rectangle"
                    ? <rect width="100%" height="100%" />
                    : <ellipse cx="50%" cy="50%" rx="50%" ry="50%" />}
                </svg>
              ) : card.kind === "line" ? (
                <svg width="100%" height="100%" className="pointer-events-none overflow-visible text-text-primary"
                  fill="none" stroke={selected === card.id ? "var(--primary)" : "currentColor"} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
                  <line x1="0" y1={card.flipLine ? "100%" : "0"} x2="100%" y2={card.flipLine ? "0" : "100%"} />
                </svg>
              ) : card.kind === "image"
                ? <img src={card.url} alt={card.name} draggable={false} className="pointer-events-none block h-auto w-full"
                    onError={() => setError(`Could not display ${card.name}. Try a supported image format.`)} />
                : <video src={card.url} aria-label={card.name} controls playsInline loop preload="metadata" className="block h-auto w-full cursor-default"
                    onDoubleClick={event => {
                      event.preventDefault();
                      event.stopPropagation();
                      setSelectedIds([]);
                      setSelected(card.id);
                      setSelectedInput(null);
                    }}
                    onPointerDown={(event) => {
                      // Alt-drag moves the video; ordinary clicks belong to native controls.
                      if (!event.altKey) event.stopPropagation();
                    }}
                    onError={() => setError(`Could not play ${card.name}. Try a supported MP4 or WebM.`)} />}
              {card.kind !== "line" && card.kind !== "section" && <CardNodes
                zoom={view.zoom}
                connectedSides={([
                  ...(card.connections ?? []).map(id => card.connectionPorts?.[id]?.source ?? "right"),
                  ...cards.filter(source => source.connections?.includes(card.id)).map(source => source.connectionPorts?.[card.id]?.target ?? "left"),
                ] as CardSide[])}
                onStart={side => startConnection(card, side)}
                onEnd={side => connectCard(card.id, side)}
                onKeyboardConnect={side => startConnection(card, side)} />}
              {selected === card.id && !(card.kind === "text" && selectedInput) && (["nw", "ne", "sw", "se"] as const).map(corner => (
                <span key={corner} data-resize-corner={corner} aria-hidden="true"
                  className={`absolute z-10 h-3 w-3 ${card.kind !== "text" ? "border border-primary bg-surface" : "bg-transparent"}`}
                  style={{
                    scale: 1 / view.zoom,
                    cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                    top: corner.includes("n") ? -6 : undefined,
                    bottom: corner.includes("s") ? -6 : undefined,
                    left: corner.includes("w") ? -6 : undefined,
                    right: corner.includes("e") ? -6 : undefined,
                  }} />
              ))}
            </div>
          ))}
          {groupBounds && !selectionBox && <div aria-label="Move selected items" className="pointer-events-none absolute z-50 border border-primary"
            style={{ left: groupBounds.x, top: groupBounds.y, width: groupBounds.width, height: groupBounds.height, borderWidth: 2 / view.zoom }}
            onPointerDown={startGroupMove}>
            <span className="pointer-events-auto absolute inset-x-0 -top-1 h-2" />
            <span className="pointer-events-auto absolute inset-x-0 -bottom-1 h-2" />
            <span className="pointer-events-auto absolute inset-y-0 -left-1 w-2" />
            <span className="pointer-events-auto absolute inset-y-0 -right-1 w-2" />
          </div>}
          {selectionBox && <div aria-hidden="true" className="pointer-events-none absolute z-50 border border-button-border bg-button-bg/30"
            style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.width, height: selectionBox.height, borderWidth: 1 / view.zoom }} />}
        </div>
      </div>
      <div role="group" aria-label="Canvas zoom" className="fixed bottom-6 right-4 z-50 flex items-center gap-1 rounded-lg border border-border bg-surface p-1.5 text-text-primary shadow-lg">
        <button type="button" aria-label="Zoom out" className="rounded-lg p-3 hover:bg-button-hover" onClick={() => zoomBy(1 / 1.2)}><FiMinus /></button>
        <span className="w-12 text-center text-xs tabular-nums">{Math.round(view.zoom * 100)}%</span>
        <button type="button" aria-label="Zoom in" className="rounded-lg p-3 hover:bg-button-hover" onClick={() => zoomBy(1.2)}><FiPlus /></button>
        <button type="button" aria-label="Fit board to screen" title="Fit board to screen" className="rounded-lg border-l border-border p-3 hover:bg-button-hover" onClick={fitBoard}><FiMaximize /></button>
      </div>
    </section>
  );
}

export default ProjectWorkspace;

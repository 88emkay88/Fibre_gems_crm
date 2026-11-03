import { useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { Customer } from "./types";

const DRAG_START_PX = 6;
const EDGE_ZONE_PX = 80;
const MAX_AUTOSCROLL_PX = 20;

export interface DragSource {
  customer: Customer;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
}

interface Gesture {
  customer: Customer;
  pointerId: number;
  startX: number;
  startY: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
  dragging: boolean;
  stageId: string | null;
  frame: number | null;
  detach: () => void;
}

interface UseKanbanDragOptions {
  boardRef: RefObject<HTMLDivElement | null>;
  onSelect: (customer: Customer) => void;
  onDrop: (customerId: string, stageId: string) => void;
}

function edgeVelocity(pointer: number, min: number, max: number): number {
  const intoLowEdge = min + EDGE_ZONE_PX - pointer;
  if (intoLowEdge > 0) return -MAX_AUTOSCROLL_PX * Math.min(1, intoLowEdge / EDGE_ZONE_PX);
  const intoHighEdge = pointer - (max - EDGE_ZONE_PX);
  if (intoHighEdge > 0) return MAX_AUTOSCROLL_PX * Math.min(1, intoHighEdge / EDGE_ZONE_PX);
  return 0;
}

function elementAt(x: number, y: number, selector: string): HTMLElement | null {
  return document.elementFromPoint(x, y)?.closest<HTMLElement>(selector) ?? null;
}

export function useKanbanDrag({ boardRef, onSelect, onDrop }: UseKanbanDragOptions) {
  const [source, setSource] = useState<DragSource | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);

  const moveOverlay = (g: Gesture) => {
    overlayRef.current?.style.setProperty(
      "transform",
      `translate3d(${g.x - g.offsetX}px, ${g.y - g.offsetY}px, 0)`,
    );
  };

  const autoScroll = (g: Gesture) => {
    const board = boardRef.current;
    if (board) {
      const rect = board.getBoundingClientRect();
      if (g.y >= rect.top && g.y <= rect.bottom) {
        board.scrollLeft += edgeVelocity(
          g.x,
          Math.max(rect.left, 0),
          Math.min(rect.right, window.innerWidth),
        );
      }
    }
    const list = elementAt(g.x, g.y, "[data-stage-list]");
    if (list) {
      const rect = list.getBoundingClientRect();
      list.scrollTop += edgeVelocity(
        g.y,
        Math.max(rect.top, 0),
        Math.min(rect.bottom, window.innerHeight),
      );
    }
  };

  const startAutoScroll = (g: Gesture) => {
    const loop = () => {
      autoScroll(g);
      g.frame = requestAnimationFrame(loop);
    };
    g.frame = requestAnimationFrame(loop);
  };

  const handleMove = (e: PointerEvent, g: Gesture) => {
    if (e.pointerId !== g.pointerId) return;
    g.x = e.clientX;
    g.y = e.clientY;

    if (!g.dragging) {
      if (Math.hypot(g.x - g.startX, g.y - g.startY) < DRAG_START_PX) return;
      g.dragging = true;
      document.body.style.userSelect = "none";
      setSource({
        customer: g.customer,
        width: g.width,
        height: g.height,
        offsetX: g.offsetX,
        offsetY: g.offsetY,
        x: g.x,
        y: g.y,
      });
      startAutoScroll(g);
    }

    moveOverlay(g);
    const stageId = elementAt(g.x, g.y, "[data-stage-id]")?.dataset.stageId ?? null;
    if (stageId !== g.stageId) {
      g.stageId = stageId;
      setOverStageId(stageId);
    }
  };

  const finishGesture = (e: PointerEvent, g: Gesture, cancelled: boolean) => {
    if (e.pointerId !== g.pointerId) return;
    gestureRef.current = null;
    g.detach();

    if (!g.dragging) {
      if (!cancelled) onSelect(g.customer);
      return;
    }

    if (g.frame !== null) cancelAnimationFrame(g.frame);
    document.body.style.userSelect = "";
    setSource(null);
    setOverStageId(null);
    if (!cancelled && g.stageId) onDrop(g.customer.id, g.stageId);
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLElement>, customer: Customer) => {
    if (e.button !== 0 || gestureRef.current) return;
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const gesture: Gesture = {
      customer,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      width: rect.width,
      height: rect.height,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      x: e.clientX,
      y: e.clientY,
      dragging: false,
      stageId: null,
      frame: null,
      detach: () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
      },
    };
    const onMove = (ev: PointerEvent) => handleMove(ev, gesture);
    const onUp = (ev: PointerEvent) => finishGesture(ev, gesture, false);
    const onCancel = (ev: PointerEvent) => finishGesture(ev, gesture, true);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    gestureRef.current = gesture;
  };

  return {
    source,
    overStageId,
    overlayRef,
    draggingId: source?.customer.id ?? null,
    startDrag: handlePointerDown,
  };
}

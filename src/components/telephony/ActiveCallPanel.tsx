import {
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";
import { Phone } from "lucide-react";
import type { AgentTelephonyState, Customer } from "./types";
import { CallControls } from "./CallControls";
import { formatCallTime } from "./telephony-service";
import { stageForStatus } from "./pipeline-stages";

const PANEL_WIDTH = 320;
const EDGE_MARGIN = 8;

type ActiveCallPanelProps = {
  telephonyState: AgentTelephonyState;
  setTelephonyState: Dispatch<SetStateAction<AgentTelephonyState>>;
  activeCustomer: Customer | null;
  onLogOutcome: () => void;
};

type Position = { x: number; y: number };

export function ActiveCallPanel({
  telephonyState,
  setTelephonyState,
  activeCustomer,
  onLogOutcome,
}: ActiveCallPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{
    pointerX: number;
    pointerY: number;
    left: number;
    top: number;
  } | null>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, input, select")) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOrigin.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      left: rect.left,
      top: rect.top,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const origin = dragOrigin.current;
    const panel = panelRef.current;
    if (!origin || !panel) return;
    const maxX = window.innerWidth - panel.offsetWidth - EDGE_MARGIN;
    const maxY = window.innerHeight - panel.offsetHeight - EDGE_MARGIN;
    const x = Math.min(Math.max(origin.left + e.clientX - origin.pointerX, EDGE_MARGIN), maxX);
    const y = Math.min(Math.max(origin.top + e.clientY - origin.pointerY, EDGE_MARGIN), maxY);
    setPosition({ x, y });
  };

  const handlePointerUp = () => {
    dragOrigin.current = null;
  };

  const placement = position ? { left: position.x, top: position.y } : { right: 24, bottom: 120 };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Active call"
      style={{ ...placement, width: PANEL_WIDTH }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="fixed z-50 flex touch-none select-none cursor-grab flex-col gap-3 rounded-[28px] bg-card/90 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.16)] ring-1 ring-black/5 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300 active:cursor-grabbing"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
            <Phone className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {telephonyState.activeCustomerName || "Active lead"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {telephonyState.activeCustomerPhone || ""}
            </p>
            {activeCustomer && (
              <span
                className={`mt-1 inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stageForStatus(activeCustomer.status).tint} ${stageForStatus(activeCustomer.status).text}`}
              >
                <span className="truncate">{stageForStatus(activeCustomer.status).title}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-center font-mono text-3xl font-semibold tabular-nums text-foreground">
        {formatCallTime(telephonyState.callDurationSeconds)}
      </p>

      <CallControls
        telephonyState={telephonyState}
        setTelephonyState={setTelephonyState}
        onLogOutcome={onLogOutcome}
      />
    </div>
  );
}

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  AudioLines,
  ChevronDown,
  ChevronUp,
  Headphones,
  Minus,
  Pause,
  Play,
  Plus,
  Volume2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveAgent, SupervisorRecording } from "@/server/supervisor-functions";
import { formatDuration } from "./AgentStatusCard";

export type DockSession =
  | { kind: "live"; agent: LiveAgent; mode: "LISTEN" | "WHISPER" | "BARGE"; durationSeconds: number }
  | { kind: "recording"; recording: SupervisorRecording };

type Position = { left: number; top: number };
const MARGIN = 12;
const SPEEDS = [1, 1.25, 1.5, 2];
const MODES = [
  { value: "LISTEN" as const, label: "Listen", detail: "Silent" },
  { value: "WHISPER" as const, label: "Whisper", detail: "Coach" },
  { value: "BARGE" as const, label: "Barge", detail: "3-way" },
];

function displayName(agent: LiveAgent) {
  return agent.full_name || agent.agent_code;
}

function maskPhone(phone: string) {
  if (phone.length < 7) return "••••••";
  return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ••••`;
}

function recordingAudioUrl(id: string) {
  const base = import.meta.env["VITE_API_BASE_URL"] || "http://127.0.0.1:8000/api/v1";
  return `${base.replace(/\/+$/, "")}/supervisor/recordings/${encodeURIComponent(id)}/audio`;
}

export function DraggableCallDock({
  session,
  onClose,
  onModeChange,
}: {
  session: DockSession;
  onClose: () => void;
  onModeChange: (mode: "LISTEN" | "WHISPER" | "BARGE") => Promise<void>;
}) {
  const dockRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const dragOrigin = useRef<{ pointerX: number; pointerY: number; left: number; top: number } | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [modePending, setModePending] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(0.85);
  const [liveSeconds, setLiveSeconds] = useState(session.kind === "live" ? session.durationSeconds : 0);

  useEffect(() => {
    if (session.kind === "live") setLiveSeconds(Math.max(0, session.durationSeconds));
  }, [session.kind, session.kind === "live" ? session.durationSeconds : 0]);

  useEffect(() => {
    if (session.kind !== "live") return;
    const timer = setInterval(() => setLiveSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [session.kind]);

  useEffect(() => {
    const clampPosition = () => {
      const dock = dockRef.current;
      if (!dock || !position) return;
      setPosition({
        left: Math.min(Math.max(MARGIN, position.left), window.innerWidth - dock.offsetWidth - MARGIN),
        top: Math.min(Math.max(MARGIN, position.top), window.innerHeight - dock.offsetHeight - MARGIN),
      });
    };
    window.addEventListener("resize", clampPosition);
    return () => window.removeEventListener("resize", clampPosition);
  }, [position]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, input, a")) return;
    const rect = dockRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOrigin.current = { pointerX: event.clientX, pointerY: event.clientY, left: rect.left, top: rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const origin = dragOrigin.current;
    const dock = dockRef.current;
    if (!origin || !dock) return;
    setPosition({
      left: Math.min(Math.max(MARGIN, origin.left + event.clientX - origin.pointerX), window.innerWidth - dock.offsetWidth - MARGIN),
      top: Math.min(Math.max(MARGIN, origin.top + event.clientY - origin.pointerY), window.innerHeight - dock.offsetHeight - MARGIN),
    });
  }

  function onPointerUp() {
    dragOrigin.current = null;
  }

  async function changeMode(next: "LISTEN" | "WHISPER" | "BARGE") {
    if (session.kind !== "live" || next === session.mode || modePending) return;
    setModePending(true);
    try {
      await onModeChange(next);
    } finally {
      setModePending(false);
    }
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => setFailed(true));
    else audio.pause();
  }

  function skip(seconds: number) {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), audio.duration || 0);
  }

  function changeSpeed(next: number) {
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  function changeVolume(next: number) {
    setVolume(next);
    if (audioRef.current) audioRef.current.volume = next;
  }

  const title = session.kind === "live" ? displayName(session.agent) : session.recording.customer_name;
  const style = position ? { left: position.left, top: position.top } : { right: 16, bottom: 96 };

  return (
    <section
      ref={dockRef}
      role="dialog"
      aria-label={session.kind === "live" ? "Live call supervision" : "Call recording player"}
      style={style}
      className="fixed z-50 w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-border bg-card/95 text-card-foreground shadow-2xl backdrop-blur-xl"
    >
      <header
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="flex cursor-grab touch-none items-center gap-3 border-b border-border px-4 py-3 active:cursor-grabbing"
      >
        <div className="grid size-9 shrink-0 place-items-center rounded bg-primary/15 text-primary">
          {session.kind === "live" ? <Headphones className="size-4" /> : <AudioLines className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {session.kind === "live"
              ? `Ext ${session.agent.extension} · ${session.mode}`
              : `${session.recording.agent_name} · ${session.recording.disposition}`}
          </p>
        </div>
        {session.kind === "live" && <span className="font-mono text-sm tabular-nums">{formatDuration(liveSeconds)}</span>}
        {session.kind === "recording" && <span className="font-mono text-sm tabular-nums">{formatDuration(current)}</span>}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={minimized ? "Expand player" : "Minimize player"}
          title={minimized ? "Expand player" : "Minimize player"}
          onClick={() => setMinimized((value) => !value)}
        >
          {minimized ? <ChevronUp /> : <Minus />}
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Close player" title="Close player" onClick={onClose}>
          <X />
        </Button>
      </header>

      {!minimized && session.kind === "live" && (
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{session.agent.active_customer?.full_name || "Live call"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {session.agent.active_customer?.phone ? maskPhone(session.agent.active_customer.phone) : "Customer details unavailable"}
              </p>
            </div>
            <span className="shrink-0 rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
              {session.mode === "LISTEN" ? "Silent listen" : session.mode === "WHISPER" ? "Coach" : "3-way barge"}
            </span>
          </div>

          <div className="flex h-12 items-center justify-center gap-1 rounded border border-border bg-background/70" aria-label="Live audio activity">
            {[3, 5, 8, 4, 7, 10, 5, 8, 3, 6, 9, 4, 7, 5, 2].map((height, index) => (
              <span
                key={index}
                className="w-1 rounded-full bg-primary/80 animate-pulse"
                style={{ height: `${height * 3}px`, animationDelay: `${index * 55}ms` }}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1 rounded border border-border bg-background p-1">
            {MODES.map((mode) => (
              <Button
                key={mode.value}
                type="button"
                size="sm"
                variant={session.mode === mode.value ? "default" : "ghost"}
                disabled={modePending}
                onClick={() => void changeMode(mode.value)}
                className="h-auto min-h-10 flex-col gap-0 py-1.5"
              >
                <span>{mode.label}</span>
                <span className="text-[10px] opacity-70">{mode.detail}</span>
              </Button>
            ))}
          </div>

          <Button type="button" variant="destructive" className="w-full" onClick={onClose}>
            <X className="size-4" /> Disconnect monitoring
          </Button>
        </div>
      )}

      {!minimized && session.kind === "recording" && (
        <div className="space-y-4 p-4">
          <audio
            ref={audioRef}
            src={recordingAudioUrl(session.recording.id)}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
            onError={() => setFailed(true)}
          />
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="truncate">{session.recording.agent_name} · {session.recording.customer_phone}</span>
            <span className="shrink-0">{new Date(session.recording.recorded_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
          {failed ? (
            <p className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              This recording could not be loaded from the recording service.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="outline" aria-label="Back 10 seconds" onClick={() => skip(-10)}><Minus /> 10s</Button>
                <Button type="button" size="sm" onClick={togglePlayback} aria-label={playing ? "Pause recording" : "Play recording"}>
                  {playing ? <Pause /> : <Play />}{playing ? "Pause" : "Play"}
                </Button>
                <Button type="button" size="sm" variant="outline" aria-label="Forward 10 seconds" onClick={() => skip(10)}><Plus /> 10s</Button>
                <div className="ml-auto flex gap-1" aria-label="Playback speed">
                  {SPEEDS.map((value) => (
                    <Button key={value} type="button" size="sm" variant={speed === value ? "secondary" : "ghost"} onClick={() => changeSpeed(value)}>
                      {value}x
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-10 font-mono text-xs tabular-nums text-muted-foreground">{formatDuration(current)}</span>
                <input
                  type="range"
                  aria-label="Seek recording"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={current}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (audioRef.current) audioRef.current.currentTime = value;
                    setCurrent(value);
                  }}
                  className="min-w-0 flex-1 accent-primary"
                />
                <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">{formatDuration(duration)}</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground" aria-label="Volume">
                  <Volume2 className="size-4" />
                  <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(event) => changeVolume(Number(event.target.value))} className="w-24 accent-primary" />
                </label>
                <a
                  href={recordingAudioUrl(session.recording.id)}
                  download
                  className="ml-auto inline-flex h-9 items-center gap-2 border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  <ChevronDown className="size-4" /> Download MP3
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {minimized && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
          <span className="truncate">{session.kind === "live" ? session.mode : "Recording"}</span>
          {session.kind === "recording" && <span className="font-mono tabular-nums">{formatDuration(current)}</span>}
          {session.kind === "live" && <span className="font-mono tabular-nums">{formatDuration(liveSeconds)}</span>}
        </div>
      )}
    </section>
  );
}
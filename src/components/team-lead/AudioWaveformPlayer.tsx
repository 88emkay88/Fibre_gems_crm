import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "./AgentStatusCard";

const SPEEDS = [1, 1.25, 1.5, 2];

export function AudioWaveformPlayer({ src, title }: { src: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [failed, setFailed] = useState(false);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }

  function skip(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), audio.duration || 0);
  }

  function changeSpeed(next: number) {
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  function seek(value: number) {
    if (audioRef.current) audioRef.current.currentTime = value;
    setCurrent(value);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <a
          href={src}
          download
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Download MP3
        </a>
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => setFailed(true)}
      />

      {failed ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          This recording could not be loaded. The recording server may be offline.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => skip(-10)} aria-label="Back 10 seconds">
              -10s
            </Button>
            <Button size="sm" onClick={togglePlay} className="min-w-20">
              {playing ? "Pause" : "Play"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => skip(10)} aria-label="Forward 10 seconds">
              +10s
            </Button>
            <div className="ml-auto flex gap-1 rounded-full border border-border p-1">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeSpeed(s)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                    speed === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-12 font-mono text-xs tabular-nums text-muted-foreground">{formatDuration(current)}</span>
            <input
              type="range"
              aria-label="Seek"
              min={0}
              max={duration || 0}
              step={0.1}
              value={current}
              onChange={(e) => seek(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="w-12 text-right font-mono text-xs tabular-nums text-muted-foreground">
              {formatDuration(duration)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

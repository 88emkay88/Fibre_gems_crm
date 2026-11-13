import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRecordingsFn, type SupervisorRecording } from "@/server/supervisor-functions";
import { AudioWaveformPlayer } from "./AudioWaveformPlayer";
import { QAEvaluationDrawer } from "./QAEvaluationDrawer";
import { formatDuration } from "./AgentStatusCard";

const DISPOSITIONS = [
  { value: "", label: "All outcomes" },
  { value: "SALE", label: "Sale" },
  { value: "CALLBK", label: "Callback" },
  { value: "NI", label: "Not interested" },
  { value: "DNC", label: "Do not call" },
];

const MIN_LENGTHS = [
  { value: 0, label: "Any length" },
  { value: 30, label: "30 seconds +" },
  { value: 60, label: "1 minute +" },
  { value: 120, label: "2 minutes +" },
];

const selectClass = "h-10 border border-input bg-background px-3 text-sm";

function formatRecordedAt(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });
}

export function RecordingsQAView() {
  const [disposition, setDisposition] = useState("");
  const [minSeconds, setMinSeconds] = useState(0);
  const [playing, setPlaying] = useState<SupervisorRecording | null>(null);
  const [grading, setGrading] = useState<SupervisorRecording | null>(null);

  const query = useQuery({
    queryKey: ["supervisor-recordings", disposition, minSeconds],
    queryFn: () =>
      getRecordingsFn({
        data: { disposition: disposition || undefined, min_seconds: minSeconds || undefined },
      }),
  });

  const recordings = query.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Outcome
          <select className={selectClass} value={disposition} onChange={(e) => setDisposition(e.target.value)}>
            {DISPOSITIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Call length
          <select className={selectClass} value={minSeconds} onChange={(e) => setMinSeconds(Number(e.target.value))}>
            {MIN_LENGTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {playing && <AudioWaveformPlayer key={playing.id} src={playing.recording_url} title={`${playing.agent_name} · ${playing.customer_name}`} />}

      {query.isPending && <p className="text-sm text-muted-foreground">Loading recordings…</p>}

      {query.isError && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "Could not load recordings."}
        </p>
      )}

      {query.isSuccess && recordings.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No recordings match these filters.
        </p>
      )}

      {query.isSuccess && recordings.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Recorded</th>
                <th className="p-3">Agent</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Outcome</th>
                <th className="p-3">QA</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="p-3 text-muted-foreground">{formatRecordedAt(r.recorded_at)}</td>
                  <td className="p-3 text-foreground">{r.agent_name}</td>
                  <td className="p-3">
                    <p className="text-foreground">{r.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{r.customer_phone}</p>
                  </td>
                  <td className="p-3 font-mono tabular-nums text-muted-foreground">{formatDuration(r.duration_seconds)}</td>
                  <td className="p-3 text-muted-foreground">{r.disposition}</td>
                  <td className="p-3">
                    {r.qa_evaluation?.status === "graded" ? (
                      <span className="rounded-full border border-emerald-500/50 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                        Graded {r.qa_evaluation.score_percent}%
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-500/50 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPlaying(r)}
                        disabled={!r.recording_url}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                        title={r.recording_url ? "Play recording" : "No recording available"}
                      >
                        Listen
                      </button>
                      <button
                        type="button"
                        onClick={() => setGrading(r)}
                        className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        {r.qa_evaluation?.status === "graded" ? "Re-grade" : "Grade call"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {grading && (
        <QAEvaluationDrawer
          key={grading.id}
          recording={grading}
          open
          onOpenChange={(open) => {
            if (!open) setGrading(null);
          }}
        />
      )}
    </div>
  );
}

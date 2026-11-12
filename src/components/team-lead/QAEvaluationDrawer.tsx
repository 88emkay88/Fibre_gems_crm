import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { evaluateRecordingFn, type SupervisorRecording } from "@/server/supervisor-functions";

type Scores = {
  greeting: number;
  pitch: number;
  objection: number;
  closing: number;
  compliance: boolean;
  notes: string;
};

const EMPTY_SCORES: Scores = { greeting: 0, pitch: 0, objection: 0, closing: 0, compliance: false, notes: "" };

function StarRating({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} of 5`}
            onClick={() => onChange(n)}
            className={`h-9 w-9 rounded-lg border text-sm font-semibold transition-colors ${
              value >= n ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function QAEvaluationDrawer({
  recording,
  open,
  onOpenChange,
}: {
  recording: SupervisorRecording;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [scores, setScores] = useState<Scores>(EMPTY_SCORES);

  const earned = scores.greeting + scores.pitch + scores.objection + scores.closing + (scores.compliance ? 5 : 0);
  const overall = Math.round((earned / 25) * 100);
  const complete = scores.greeting > 0 && scores.pitch > 0 && scores.objection > 0 && scores.closing > 0;

  const submit = useMutation({
    mutationFn: () =>
      evaluateRecordingFn({
        data: {
          recording_id: recording.id,
          greeting_score: scores.greeting,
          pitch_score: scores.pitch,
          objection_handling_score: scores.objection,
          closing_score: scores.closing,
          compliance_verified: scores.compliance,
          feedback_notes: scores.notes.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("QA evaluation saved");
      void qc.invalidateQueries({ queryKey: ["supervisor-recordings"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save the evaluation"),
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!complete) {
      toast.error("Score every criterion before submitting");
      return;
    }
    submit.mutate();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Grade call</SheetTitle>
          <SheetDescription>
            {recording.agent_name} with {recording.customer_name}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 py-6">
          <StarRating label="Professional greeting" value={scores.greeting} onChange={(v) => setScores((s) => ({ ...s, greeting: v }))} />
          <StarRating label="Product knowledge and pitch" value={scores.pitch} onChange={(v) => setScores((s) => ({ ...s, pitch: v }))} />
          <StarRating label="Objection handling and tone" value={scores.objection} onChange={(v) => setScores((s) => ({ ...s, objection: v }))} />
          <StarRating label="Closing and next steps" value={scores.closing} onChange={(v) => setScores((s) => ({ ...s, closing: v }))} />

          <label className="flex items-center justify-between gap-3 text-sm text-foreground">
            Compliance and disclosures read
            <input
              type="checkbox"
              checked={scores.compliance}
              onChange={(e) => setScores((s) => ({ ...s, compliance: e.target.checked }))}
              className="h-5 w-5 accent-primary"
            />
          </label>

          <div>
            <label htmlFor="qa_notes" className="text-sm font-medium text-foreground">
              Supervisor notes
            </label>
            <textarea
              id="qa_notes"
              className="mt-1 min-h-24 w-full border border-input bg-background p-3 text-sm"
              value={scores.notes}
              onChange={(e) => setScores((s) => ({ ...s, notes: e.target.value }))}
            />
          </div>

          <div className="mt-auto flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4">
            <span className="text-sm text-muted-foreground">Overall score</span>
            <span className="text-2xl font-semibold tabular-nums text-foreground">{overall}%</span>
          </div>

          <SheetFooter>
            <Button type="submit" disabled={submit.isPending} className="w-full">
              {submit.isPending ? "Saving…" : "Submit evaluation"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

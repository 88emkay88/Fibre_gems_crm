import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CallbackPoolView } from "./CallbackPoolView";
import { LiveFloorMonitor } from "./LiveFloorMonitor";

type Section = "floor" | "callbacks";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "floor", label: "Live floor" },
  { id: "callbacks", label: "Callback pool" },
];

export function TeamLeadWorkspace() {
  const [section, setSection] = useState<Section>("floor");

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Team lead floor</h1>
          <p className="text-sm text-muted-foreground">Watch every agent, step in on live calls, and manage callbacks.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-full border border-border bg-card p-1">
            {SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  section === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Link
            to="/agent"
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Agent view
          </Link>
        </div>
      </div>

      {section === "floor" ? <LiveFloorMonitor /> : <CallbackPoolView />}
    </div>
  );
}

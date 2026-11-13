import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Headphones, Clock, Radio, RefreshCw, Save, ShieldCheck } from "lucide-react";

export interface TeamLeadSettingsData {
  supervisorExtension: string;
  maxPauseMinutes: number;
  maxCallMinutes: number;
  defaultMonitorMode: "LISTEN" | "WHISPER" | "BARGE";
}

export const DEFAULT_SETTINGS: TeamLeadSettingsData = {
  supervisorExtension: "101",
  maxPauseMinutes: 15,
  maxCallMinutes: 25,
  defaultMonitorMode: "LISTEN",
};

export function getStoredTeamLeadSettings(): TeamLeadSettingsData {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem("fibregems_teamlead_settings");
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function TeamLeadSettingsView() {
  const [settings, setSettings] = useState<TeamLeadSettingsData>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(getStoredTeamLeadSettings());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("fibregems_teamlead_settings", JSON.stringify(settings));
    toast.success("Team Lead preferences saved successfully");
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white">Supervisor Preferences & Audio Configuration</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Configure your listening softphone extension, alert flags for agent overtime, and audio ChanSpy defaults.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Softphone Section */}
        <div className="rounded-2xl border border-white/10 bg-[#121212]/95 p-5 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
            <div className="grid size-8 place-items-center rounded-lg bg-[#F5B021]/15 text-[#F5B021]">
              <Headphones className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Supervisor Audio Extension</h3>
              <p className="text-xs text-muted-foreground">The SIP extension on your deskphone or MicroSIP where audio spied calls will ring.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/80">Listening Phone Extension</label>
              <input
                type="text"
                value={settings.supervisorExtension}
                onChange={(e) => setSettings({ ...settings, supervisorExtension: e.target.value })}
                placeholder="101"
                required
                className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm text-white focus:border-[#F5B021] focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground">e.g. 101, gs102, or your Zoiper softphone</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/80">Default Supervision Action</label>
              <select
                value={settings.defaultMonitorMode}
                onChange={(e) => setSettings({ ...settings, defaultMonitorMode: e.target.value as any })}
                className="w-full h-10 rounded-xl border border-white/10 bg-[#1a1a1a] px-3.5 text-sm text-white focus:border-[#F5B021] focus:outline-none"
              >
                <option value="LISTEN">LISTEN (Silent Monitor — neither party hears you)</option>
                <option value="WHISPER">WHISPER (Coach — speak into agent ear only)</option>
                <option value="BARGE">BARGE (3-Way Conference — all parties speak)</option>
              </select>
              <p className="text-[11px] text-muted-foreground">Primary mode when tapping quick monitor on cards</p>
            </div>
          </div>
        </div>

        {/* Floor Alert Rules */}
        <div className="rounded-2xl border border-white/10 bg-[#121212]/95 p-5 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
            <div className="grid size-8 place-items-center rounded-lg bg-[#D44B2E]/15 text-[#D44B2E]">
              <Clock className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Live Floor Alert Thresholds</h3>
              <p className="text-xs text-muted-foreground">Visual warning badges on agent cards when state durations exceed policy.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/80">Max Pause Limit (Minutes)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={settings.maxPauseMinutes}
                onChange={(e) => setSettings({ ...settings, maxPauseMinutes: Number(e.target.value) })}
                className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm text-white focus:border-[#F5B021] focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground">Card pulses red if an agent stays on break longer than this</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/80">Max Single Call Duration (Minutes)</label>
              <input
                type="number"
                min="5"
                max="180"
                value={settings.maxCallMinutes}
                onChange={(e) => setSettings({ ...settings, maxCallMinutes: Number(e.target.value) })}
                className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm text-white focus:border-[#F5B021] focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground">Highlights potentially stuck calls needing supervisor assistance</p>
            </div>
          </div>
        </div>

        <p className="flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <Radio className="size-4 text-success" /> Live floor updates arrive automatically from the telephony service.
        </p>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E07C2A] to-[#F5B021] px-6 py-2.5 text-xs font-bold text-black shadow-lg shadow-[#F5B021]/20 transition hover:opacity-90 active:scale-95 cursor-pointer"
          >
            <Save className="size-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}


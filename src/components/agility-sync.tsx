import { useState, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getAgilityBatchesFn, getWorkspaceDataFn, commitAgilitySyncFn } from "@/server/functions";
import { Button } from "@/components/ui/button";

type Parsed = {
  row_number: number;
  raw: Record<string, string>;
  ovr: string | null;
  ovk: string | null;
  product: string | null;
  state: string | null;
  customerId: string | null;
  errors: string[];
};

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      cur.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      cur.push(field);
      field = "";
      if (cur.some((c) => c.trim())) rows.push(cur);
      cur = [];
    } else field += ch;
  }
  cur.push(field);
  if (cur.some((c) => c.trim())) rows.push(cur);
  const [head, ...body] = rows;
  if (!head) return [];
  const keys = head.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

const productMap: Record<string, string> = {
  "fttr-20-10": "Vuma Reach 20Mbps/10Mbps",
  "fttr-10-10": "Vuma Reach 10Mbps/10Mbps",
};

async function sha(text: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(b))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export function AgilitySync() {
  const qc = useQueryClient();
  const [file, setFile] = useState<{ name: string; hash: string } | null>(null);
  const [rows, setRows] = useState<Parsed[]>([]);
  const [busy, setBusy] = useState(false);

  const history = useQuery({
    queryKey: ["agility-batches"],
    queryFn: async () => {
      return await getAgilityBatchesFn();
    },
  });

  const workspaceData = useQuery({
    queryKey: ["crm-workspace", "admin"],
    queryFn: async () => {
      return await getWorkspaceDataFn({ data: { mode: "admin" } });
    },
  });

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const data = parseCsv(text);
    const orders = workspaceData.data?.orders ?? [];

    const parsed = data.map((raw, i) => {
      const blob = Object.values(raw).join(" ");
      const ovr = blob.match(/OVR[-\s]?\d+/i)?.[0].replace(/[-\s]/g, "").toUpperCase() ?? null;
      const ovk = blob.match(/OVK[-\s]?\d+/i)?.[0].replace(/[-\s]/g, "").toUpperCase() ?? null;
      const lower = blob.toLowerCase();
      const product = Object.keys(productMap).find((k) => lower.includes(k)) ?? null;
      const state = lower.includes("activated") ? "activated" : lower.includes("paymentrec") ? "paid" : null;
      const match = (orders ?? []).find(
        (o) =>
          (ovr && o.ovr_number?.toUpperCase() === ovr) ||
          (ovk && o.ovk_number?.toUpperCase() === ovk)
      );
      const errors: string[] = [];
      if (!ovr && !ovk) errors.push("No OVR/OVK reference found");
      else if (!match) errors.push("No matching CRM order");
      return {
        row_number: i + 1,
        raw,
        ovr,
        ovk,
        product: product ? productMap[product] ?? null : null,
        state,
        customerId: match?.customer_id ?? null,
        errors,
      };
    });

    setFile({ name: f.name, hash: await sha(text) });
    setRows(parsed);
    e.target.value = "";
  }

  async function commit() {
    if (!file) return;
    setBusy(true);

    try {
      const res = await commitAgilitySyncFn({
        data: {
          fileName: file.name,
          fileHash: file.hash,
          rows,
        },
      });

      setBusy(false);
      setRows([]);
      setFile(null);
      toast.success(`${res.count} records synced successfully`);
      void qc.invalidateQueries({ queryKey: ["agility-batches"] });
      void qc.invalidateQueries({ queryKey: ["crm-workspace"] });
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
  }

  const ok = rows.filter((r) => !r.errors.length).length;

  return (
    <section className="space-y-6">
      <div className="border border-border bg-card p-6">
        <h2 className="text-xl font-bold">Agility Sync Engine</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload the Agility report as a CSV. References (OVR/OVK) are matched to CRM orders; payments and activations
          update automatically.
        </p>
        <label className="mt-5 flex cursor-pointer flex-col items-center gap-2 border border-dashed border-border py-10 text-sm text-muted-foreground hover:border-primary">
          <Upload className="size-6 text-primary" /> Choose Agility CSV file
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={pick} />
        </label>
      </div>

      {file && (
        <div className="border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div className="text-sm">
              <span className="font-semibold">{file.name}</span> — {rows.length} rows,{" "}
              <span className="text-success">{ok} ready</span>,{" "}
              <span className="text-destructive">{rows.length - ok} with issues</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setRows([]);
                }}
              >
                Cancel
              </Button>
              <Button disabled={busy || !ok} onClick={commit}>
                {busy ? "Syncing…" : `Commit ${ok} rows`}
              </Button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  {["#", "OVR", "OVK", "Product", "Update", "Result"].map((h) => (
                    <th key={h} className="px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row_number} className="border-t border-border">
                    <td className="px-4 py-3">{r.row_number}</td>
                    <td className="px-4 py-3">{r.ovr ?? "—"}</td>
                    <td className="px-4 py-3">{r.ovk ?? "—"}</td>
                    <td className="px-4 py-3">{r.product ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.state === "paid" ? "Paid" : r.state === "activated" ? "Activated" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.errors.length ? (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <AlertTriangle className="size-4" />
                          {r.errors[0]}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-success">
                          <CheckCircle2 className="size-4" />
                          Ready
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="border border-border bg-card">
        <h3 className="border-b border-border p-4 font-semibold">Import history</h3>
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              {["File", "Date", "Rows", "Synced", "Issues"].map((h) => (
                <th key={h} className="px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(history.data ?? []).map((b: any) => (
              <tr key={b.id} className="border-t border-border">
                <td className="px-4 py-3 font-semibold">{b.fileName || b.file_name}</td>
                <td className="px-4 py-3">
                  {new Date(b.createdAt || b.created_at).toLocaleDateString("en-ZA")}
                </td>
                <td className="px-4 py-3">{b.rowCount || b.row_count}</td>
                <td className="px-4 py-3 text-success">{b.updatedCount || b.updated_count}</td>
                <td className="px-4 py-3 text-destructive">{b.errorCount || b.error_count}</td>
              </tr>
            ))}
            {(!history.data || history.data.length === 0) && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  No imports recorded yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

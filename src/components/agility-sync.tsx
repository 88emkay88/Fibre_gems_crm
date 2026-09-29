import { useState, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Parsed = { row_number: number; raw: Record<string, string>; ovr: string | null; ovk: string | null; product: string | null; state: string | null; customerId: string | null; errors: string[] };

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let cur: string[] = []; let field = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') q = false; else field += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { cur.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; cur.push(field); field = ""; if (cur.some(c => c.trim())) rows.push(cur); cur = []; }
    else field += ch;
  }
  cur.push(field); if (cur.some(c => c.trim())) rows.push(cur);
  const [head, ...body] = rows; if (!head) return [];
  const keys = head.map(h => h.trim().toLowerCase());
  return body.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

const productMap: Record<string, string> = { "fttr-20-10": "Vuma Reach 20Mbps/10Mbps", "fttr-10-10": "Vuma Reach 10Mbps/10Mbps" };

async function sha(text: string) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join(""); }

export function AgilitySync() {
  const qc = useQueryClient();
  const [file, setFile] = useState<{ name: string; hash: string } | null>(null);
  const [rows, setRows] = useState<Parsed[]>([]);
  const [busy, setBusy] = useState(false);
  const history = useQuery({ queryKey: ["agility-batches"], queryFn: async () => { const { data, error } = await supabase.from("agility_import_batches").select("*").order("created_at", { ascending: false }).limit(20); if (error) throw error; return data; } });

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const text = await f.text(); const data = parseCsv(text);
    const { data: orders } = await supabase.from("orders").select("customer_id, ovr_number, ovk_number");
    const parsed = data.map((raw, i) => {
      const blob = Object.values(raw).join(" ");
      const ovr = blob.match(/OVR[-\s]?\d+/i)?.[0].replace(/[-\s]/g, "").toUpperCase() ?? null;
      const ovk = blob.match(/OVK[-\s]?\d+/i)?.[0].replace(/[-\s]/g, "").toUpperCase() ?? null;
      const lower = blob.toLowerCase();
      const product = Object.keys(productMap).find(k => lower.includes(k)) ?? null;
      const state = lower.includes("activated") ? "activated" : lower.includes("paymentrec") ? "paid" : null;
      const match = (orders ?? []).find(o => (ovr && o.ovr_number?.toUpperCase() === ovr) || (ovk && o.ovk_number?.toUpperCase() === ovk));
      const errors: string[] = [];
      if (!ovr && !ovk) errors.push("No OVR/OVK reference found");
      else if (!match) errors.push("No matching CRM order");
      return { row_number: i + 1, raw, ovr, ovk, product: product ? productMap[product] : null, state, customerId: match?.customer_id ?? null, errors };
    });
    setFile({ name: f.name, hash: await sha(text) }); setRows(parsed); e.target.value = "";
  }

  async function commit() {
    if (!file) return; setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setBusy(false); toast.error("Sign in again"); return; }
    const valid = rows.filter(r => !r.errors.length);
    const { data: batch, error } = await supabase.from("agility_import_batches").insert({ file_name: file.name, file_hash: file.hash, uploaded_by: auth.user.id, row_count: rows.length, error_count: rows.length - valid.length, updated_count: valid.length, status: "committed", committed_at: new Date().toISOString() }).select("id").single();
    if (error || !batch) { setBusy(false); toast.error(error?.code === "23505" ? "This file has already been imported" : error?.message ?? "Import failed"); return; }
    await supabase.from("agility_import_rows").insert(rows.map(r => ({ batch_id: batch.id, row_number: r.row_number, raw_data: r.raw, ovr_number: r.ovr, ovk_number: r.ovk, validation_status: r.errors.length ? "error" : "synced", validation_errors: r.errors, customer_id: r.customerId })));
    const today = new Date().toISOString().slice(0, 10);
    for (const r of valid) {
      const id = r.customerId!;
      const patch: { product_package?: string; status?: "activation_pending" | "activated" } = {};
      if (r.product) patch.product_package = r.product;
      if (r.state === "paid") { patch.status = "activation_pending"; await supabase.from("payments").update({ status: "Paid", payment_date: today, verified_at: new Date().toISOString() }).eq("customer_id", id); }
      if (r.state === "activated") { patch.status = "activated"; await supabase.from("activations").update({ status: "Activated", activation_date: today, verified_at: new Date().toISOString() }).eq("customer_id", id); }
      if (Object.keys(patch).length) await supabase.from("customers").update(patch).eq("id", id);
      await supabase.from("activities").insert({ customer_id: id, actor_id: auth.user.id, action_type: "Agility sync", outcome: r.state ?? "Synced", notes: `Batch ${file.name}` });
    }
    setBusy(false); setRows([]); setFile(null);
    toast.success(`${valid.length} records synced`);
    void qc.invalidateQueries();
  }

  const ok = rows.filter(r => !r.errors.length).length;
  return <section className="space-y-6">
    <div className="border border-border bg-card p-6">
      <h2 className="text-xl font-bold">Agility Sync Engine</h2>
      <p className="mt-1 text-sm text-muted-foreground">Upload the Agility report as a CSV. References (OVR/OVK) are matched to CRM orders; payments and activations update automatically.</p>
      <label className="mt-5 flex cursor-pointer flex-col items-center gap-2 border border-dashed border-border py-10 text-sm text-muted-foreground hover:border-primary">
        <Upload className="size-6 text-primary" /> Choose Agility CSV file
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={pick} />
      </label>
    </div>
    {file && <div className="border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="text-sm"><span className="font-semibold">{file.name}</span> — {rows.length} rows, <span className="text-success">{ok} ready</span>, <span className="text-destructive">{rows.length - ok} with issues</span></div>
        <div className="flex gap-2"><Button variant="outline" onClick={() => { setFile(null); setRows([]); }}>Cancel</Button><Button disabled={busy || !ok} onClick={commit}>{busy ? "Syncing…" : `Commit ${ok} rows`}</Button></div>
      </div>
      <div className="max-h-[420px] overflow-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>{["#", "OVR", "OVK", "Product", "Update", "Result"].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
        <tbody>{rows.map(r => <tr key={r.row_number} className="border-t border-border"><td className="px-4 py-3">{r.row_number}</td><td className="px-4 py-3">{r.ovr ?? "—"}</td><td className="px-4 py-3">{r.ovk ?? "—"}</td><td className="px-4 py-3">{r.product ?? "—"}</td><td className="px-4 py-3">{r.state === "paid" ? "Paid" : r.state === "activated" ? "Activated" : "—"}</td><td className="px-4 py-3">{r.errors.length ? <span className="inline-flex items-center gap-1 text-destructive"><AlertTriangle className="size-4" />{r.errors[0]}</span> : <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="size-4" />Ready</span>}</td></tr>)}</tbody></table></div>
    </div>}
    <div className="border border-border bg-card">
      <h3 className="border-b border-border p-4 font-semibold">Import history</h3>
      <table className="w-full text-left text-sm"><thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>{["File", "Date", "Rows", "Synced", "Issues"].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
        <tbody>{(history.data ?? []).map(b => <tr key={b.id} className="border-t border-border"><td className="px-4 py-3 font-semibold">{b.file_name}</td><td className="px-4 py-3">{new Date(b.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</td><td className="px-4 py-3">{b.row_count}</td><td className="px-4 py-3">{b.updated_count}</td><td className="px-4 py-3">{b.error_count}</td></tr>)}</tbody></table>
      {!history.data?.length && <p className="py-10 text-center text-sm text-muted-foreground">No imports yet</p>}
    </div>
  </section>;
}

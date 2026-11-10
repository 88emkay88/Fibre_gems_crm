import { useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PRODUCT_PACKAGES, type Customer } from "./types";
import { updateCustomerDetailsApi } from "./telephony-service";

const PAYMENT_TYPES = ["Prepaid", "Debit Order", "EasyPay"] as const;
const inputClass = "mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

type DetailsForm = {
  first_name: string;
  surname: string;
  alternate_cell_number: string;
  email: string;
  full_address: string;
  area_suburb: string;
  product_package: string;
  payment_type: string;
  easypay_number: string;
  easypay_cycle: string;
  easypay_expiry_date: string;
  ovr_number: string;
  ovk_number: string;
};

function FieldBox({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function OutcomeCustomerDetails({ customer }: { customer: Customer }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<DetailsForm>({
    first_name: customer.first_name ?? "",
    surname: customer.surname ?? "",
    alternate_cell_number: customer.alternate_cell_number ?? "",
    email: customer.email ?? "",
    full_address: customer.full_address ?? "",
    area_suburb: customer.area_suburb ?? "",
    product_package: customer.product_package ?? "",
    payment_type: customer.payment_type ?? "",
    easypay_number: customer.easypay_number ?? "",
    easypay_cycle: customer.easypay_cycle != null ? String(customer.easypay_cycle) : "",
    easypay_expiry_date: customer.easypay_expiry_date ?? customer.easypay_expiry ?? "",
    ovr_number: customer.ovr_number ?? "",
    ovk_number: customer.ovk_number ?? "",
  });

  function update<K extends keyof DetailsForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateCustomerDetailsApi(customer.id, {
        first_name: form.first_name,
        surname: form.surname,
        alternate_cell_number: form.alternate_cell_number.trim() || null,
        email: form.email.trim() || null,
        full_address: form.full_address.trim() || null,
        area_suburb: form.area_suburb.trim() || null,
        product_package: form.product_package || null,
        payment_type: form.payment_type || null,
        easypay_number: form.easypay_number.trim() || null,
        easypay_cycle: form.easypay_cycle.trim() || null,
        easypay_expiry_date: form.easypay_expiry_date.trim() || null,
        ovr_number: form.ovr_number.trim() || null,
        ovk_number: form.ovk_number.trim() || null,
      });
      void qc.invalidateQueries({ queryKey: ["crm-workspace"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save details");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 border-b border-border pb-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldBox id="det_first_name" label="First Name">
          <input
            id="det_first_name"
            required
            className={inputClass}
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
          />
        </FieldBox>
        <FieldBox id="det_surname" label="Surname">
          <input
            id="det_surname"
            required
            className={inputClass}
            value={form.surname}
            onChange={(e) => update("surname", e.target.value)}
          />
        </FieldBox>
        <FieldBox id="det_cell" label="Primary Cell (read only)">
          <input id="det_cell" readOnly className={`${inputClass} text-muted-foreground bg-muted/30`} value={customer.cell_number} />
        </FieldBox>
        <FieldBox id="det_ref" label="Referral Code (read only)">
          <input
            id="det_ref"
            readOnly
            className={`${inputClass} text-muted-foreground bg-muted/30 font-mono`}
            value={customer.referral_code || "Generated upon activation"}
          />
        </FieldBox>
        <FieldBox id="det_alt" label="Alternate Cell">
          <input
            id="det_alt"
            className={inputClass}
            placeholder="083..."
            value={form.alternate_cell_number}
            onChange={(e) => update("alternate_cell_number", e.target.value)}
          />
        </FieldBox>
        <FieldBox id="det_email" label="Email Address">
          <input
            id="det_email"
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </FieldBox>
        <FieldBox id="det_area" label="Area / Suburb">
          <input
            id="det_area"
            className={inputClass}
            value={form.area_suburb}
            onChange={(e) => update("area_suburb", e.target.value)}
          />
        </FieldBox>
      </div>

      <FieldBox id="det_address" label="Street / Physical Address">
        <textarea
          id="det_address"
          className="mt-1 min-h-16 w-full rounded-md border border-input bg-background p-3 text-sm"
          value={form.full_address}
          onChange={(e) => update("full_address", e.target.value)}
        />
      </FieldBox>

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldBox id="det_package" label="Product Package">
          <select
            id="det_package"
            className={inputClass}
            value={form.product_package}
            onChange={(e) => update("product_package", e.target.value)}
          >
            <option value="">Select package</option>
            {PRODUCT_PACKAGES.map((pkg) => (
              <option key={pkg} value={pkg}>{pkg}</option>
            ))}
          </select>
        </FieldBox>
        <FieldBox id="det_payment" label="Payment Type">
          <select
            id="det_payment"
            className={inputClass}
            value={form.payment_type}
            onChange={(e) => update("payment_type", e.target.value)}
          >
            <option value="">Select payment type</option>
            {PAYMENT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </FieldBox>
        <FieldBox id="det_ep_number" label="EasyPay Number">
          <input
            id="det_ep_number"
            className={inputClass}
            placeholder="e.g. 91234567890"
            value={form.easypay_number}
            onChange={(e) => update("easypay_number", e.target.value)}
          />
        </FieldBox>
        <FieldBox id="det_ep_cycle" label="EasyPay Cycle (1 - 3)">
          <select
            id="det_ep_cycle"
            className={inputClass}
            value={form.easypay_cycle || "1"}
            onChange={(e) => update("easypay_cycle", e.target.value)}
          >
            <option value="1">Cycle 1 (Initial Cycle)</option>
            <option value="2">Cycle 2</option>
            <option value="3">Cycle 3</option>
          </select>
        </FieldBox>
        <div className="col-span-2">
          <FieldBox id="det_ep_expiry" label="EasyPay Expiry (Auto-set, not manually editable)">
            <input
              id="det_ep_expiry"
              readOnly
              className={`${inputClass} text-muted-foreground bg-muted/30 cursor-not-allowed`}
              value={form.easypay_expiry_date || "Calculated (+14 days)"}
            />
          </FieldBox>
        </div>
        <FieldBox id="det_ovr_number" label="OVR Number (Vumatel / OpenServe)">
          <input
            id="det_ovr_number"
            className={`${inputClass} font-mono`}
            placeholder="e.g. OVR1234567"
            value={form.ovr_number}
            onChange={(e) => update("ovr_number", e.target.value)}
          />
        </FieldBox>
        <FieldBox id="det_ovk_number" label="OVK Number (ONT / Voucher Key)">
          <input
            id="det_ovk_number"
            className={`${inputClass} font-mono`}
            placeholder="e.g. OVK1234567"
            value={form.ovk_number}
            onChange={(e) => update("ovk_number", e.target.value)}
          />
        </FieldBox>
      </div>

      <div className="flex justify-end pt-1">
        <Button type="submit" variant="outline" size="sm" disabled={busy}>
          {busy ? "Saving details…" : "Save Customer Details"}
        </Button>
      </div>
    </form>
  );
}

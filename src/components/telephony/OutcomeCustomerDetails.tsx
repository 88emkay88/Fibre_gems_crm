import { useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PRODUCT_PACKAGES, type Customer } from "./types";
import { updateCustomerDetailsApi } from "./telephony-service";

const PAYMENT_TYPES = ["Prepaid", "Debit Order", "EasyPay"];
const inputClass = "mt-1 h-10 w-full border border-input bg-background px-3 text-sm";

type DetailsForm = {
  first_name: string;
  surname: string;
  alternate_cell_number: string;
  email: string;
  full_address: string;
  area_suburb: string;
  product_package: string;
  payment_type: string;
};

function FieldBox({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldBox id="det_first_name" label="First name">
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
        <FieldBox id="det_cell" label="Cell number (read only)">
          <input id="det_cell" readOnly className={`${inputClass} text-muted-foreground`} value={customer.cell_number} />
        </FieldBox>
        <FieldBox id="det_alt" label="Alternate number">
          <input
            id="det_alt"
            className={inputClass}
            value={form.alternate_cell_number}
            onChange={(e) => update("alternate_cell_number", e.target.value)}
          />
        </FieldBox>
        <FieldBox id="det_email" label="Email address">
          <input
            id="det_email"
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </FieldBox>
        <FieldBox id="det_area" label="Area / suburb">
          <input
            id="det_area"
            className={inputClass}
            value={form.area_suburb}
            onChange={(e) => update("area_suburb", e.target.value)}
          />
        </FieldBox>
      </div>
      <FieldBox id="det_address" label="Physical address">
        <textarea
          id="det_address"
          className="mt-1 min-h-16 w-full border border-input bg-background p-3 text-sm"
          value={form.full_address}
          onChange={(e) => update("full_address", e.target.value)}
        />
      </FieldBox>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldBox id="det_package" label="Package">
          <select
            id="det_package"
            className={inputClass}
            value={form.product_package}
            onChange={(e) => update("product_package", e.target.value)}
          >
            <option value="">Select package</option>
            {PRODUCT_PACKAGES.map((pkg) => (
              <option key={pkg}>{pkg}</option>
            ))}
          </select>
        </FieldBox>
        <FieldBox id="det_payment" label="Payment type">
          <select
            id="det_payment"
            className={inputClass}
            value={form.payment_type}
            onChange={(e) => update("payment_type", e.target.value)}
          >
            <option value="">Select payment type</option>
            {PAYMENT_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </FieldBox>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="outline" disabled={busy}>
          {busy ? "Saving details…" : "Save details"}
        </Button>
      </div>
    </form>
  );
}

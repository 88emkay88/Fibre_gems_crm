import React, { useState } from "react";
import {
  PhoneCall,
  Radio,
  UserPlus,
  Clock,
  Sparkles,
  Play,
  X,
  Volume2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import type { Customer } from "./types";

interface ViciDialSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  existingCustomers: Customer[];
  onTriggerCall: (simulatedCustomer: Customer) => void;
}

export function ViciDialSimulator({
  isOpen,
  onClose,
  existingCustomers,
  onTriggerCall,
}: ViciDialSimulatorProps) {
  if (!isOpen) return null;

  const handleSimulateNewLead = () => {
    const id = `demo-vici-${Date.now()}`;
    const viciLeadId = Math.floor(100000 + Math.random() * 900000).toString();
    const mockLead: Customer = {
      id,
      first_name: "Sipho",
      surname: "Dlamini",
      full_name: "Sipho Dlamini",
      cell_number: "0825550192",
      alternate_cell_number: "0119823411",
      email: "sipho.dlamini@demo.co.za",
      full_address: "248 Khumalo Street, Ext 2",
      area_suburb: "Vosloorus",
      product_package: "Vuma Reach 20Mbps/10Mbps",
      payment_type: "Prepaid",
      status: "new_lead",
      owner_id: "demo-agent-id",
      created_at: new Date().toISOString(),
      easypay_number: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
      easypay_cycle: "1",
      easypay_expiry_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    };

    toast.success(`⚡ ViciDial Screen Pop: Lead #${viciLeadId}`, {
      description: "Inbound connected: Sipho Dlamini (082 555 0192)",
    });

    onTriggerCall(mockLead);
    onClose();
  };

  const handleSimulateReturningClient = () => {
    const id = `demo-vici-returning-${Date.now()}`;
    const viciLeadId = Math.floor(100000 + Math.random() * 900000).toString();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const mockReturning: Customer = {
      id,
      first_name: "Lerato",
      surname: "Sithole",
      full_name: "Lerato Sithole",
      cell_number: "0718829910",
      alternate_cell_number: "0832210091",
      email: "lerato.s@demo.co.za",
      full_address: "12 Marula Crescent",
      area_suburb: "Soweto Meadowlands",
      product_package: "Vuma Reach 50Mbps/25Mbps",
      payment_type: "Prepaid",
      status: "payment_pending",
      owner_id: "demo-agent-id",
      last_contact_date: yesterday,
      next_action: "Payment promised follow up",
      next_action_date: new Date().toISOString().slice(0, 10),
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      easypay_number: "9823401928",
      easypay_cycle: "2",
      easypay_expiry_date: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
    };

    toast.success(`⚡ ViciDial Screen Pop: Returning Client #${viciLeadId}`, {
      description: "Inbound connected: Lerato Sithole (071 882 9910)",
    });

    onTriggerCall(mockReturning);
    onClose();
  };

  const handleSimulateExisting = (c: Customer) => {
    const viciLeadId = Math.floor(100000 + Math.random() * 900000).toString();
    toast.success(`⚡ ViciDial Pop: ${c.full_name || c.first_name} (Lead #${viciLeadId})`, {
      description: `Active call connected on ${c.cell_number}`,
    });
    onTriggerCall(c);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#121212] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#E07C2A] to-[#F5B021] text-black">
              <Radio className="size-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">ViciDial Screen Pop Simulator</h3>
              <p className="text-[10px] uppercase tracking-wider text-[#F5B021]">
                Test Live Telephony Without Backend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scenarios */}
        <div className="mt-5 space-y-3">
          <p className="text-xs text-white/50">
            Simulate an incoming live call arriving from ViciDial predictive dialer. This will trigger the
            green live call status, auto-recording indicator, timer, and pop the customer modal.
          </p>

          {/* Option 1: Fresh New Lead */}
          <button
            onClick={handleSimulateNewLead}
            className="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3 text-left transition hover:border-[#F5B021]/50 hover:bg-[#F5B021]/5"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-400">
                <UserPlus className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-[#F5B021]">
                  1. Fresh New Lead (Sipho Dlamini)
                </p>
                <p className="text-[10px] text-white/40">Vosloorus · Vuma Reach 20Mbps · First touch</p>
              </div>
            </div>
            <Play className="size-3.5 text-white/30 group-hover:text-[#F5B021]" />
          </button>

          {/* Option 2: Returning Client */}
          <button
            onClick={handleSimulateReturningClient}
            className="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3 text-left transition hover:border-[#F5B021]/50 hover:bg-[#F5B021]/5"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-lg bg-[#F5B021]/10 text-[#F5B021]">
                <Clock className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-[#F5B021]">
                  2. Returning Client (Lerato Sithole)
                </p>
                <p className="text-[10px] text-[#F5B021]/80">
                  Yellow Badge · Last Call: Yesterday · EasyPay active
                </p>
              </div>
            </div>
            <Play className="size-3.5 text-white/30 group-hover:text-[#F5B021]" />
          </button>

          {/* Option 3: Existing Pipeline Lead */}
          {existingCustomers.length > 0 && (
            <div className="pt-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/30">
                Or trigger from existing pipeline:
              </label>
              <div className="mt-1.5 max-h-36 space-y-1.5 overflow-y-auto pr-1">
                {existingCustomers.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSimulateExisting(c)}
                    className="flex w-full items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-left text-xs text-white/80 transition hover:border-white/20 hover:bg-white/5"
                  >
                    <span className="truncate font-semibold">{c.full_name || c.first_name}</span>
                    <span className="font-mono text-[10px] text-white/40">{c.cell_number}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Notice */}
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-[11px] text-white/40">
          <ShieldAlert className="size-4 shrink-0 text-[#F5B021]" />
          <span>No backend configuration required — simulates ViciDial Webform payload in real time.</span>
        </div>
      </div>
    </div>
  );
}


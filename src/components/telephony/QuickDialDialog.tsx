import { useState, type FormEvent } from "react";
import { Delete, PhoneCall } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dialNumberApi, type DialResult } from "./telephony-service";

interface QuickDialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDialed: (phone: string, result: DialResult) => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export function QuickDialDialog({ open, onOpenChange, onDialed }: QuickDialDialogProps) {
  const [phone, setPhone] = useState("");
  const [isDialing, setIsDialing] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed || isDialing) return;
    setIsDialing(true);
    const result = await dialNumberApi(trimmed);
    setIsDialing(false);
    if (!result) return;
    onDialed(trimmed, result);
    setPhone("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Quick dial</DialogTitle>
          <DialogDescription>
            Type or tap a number. If it matches one of your leads, the call is linked to that lead.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-2">
            <Input
              type="tel"
              inputMode="tel"
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="082 123 4567"
              aria-label="Phone number"
              className="h-12 rounded-2xl text-center font-mono text-lg tracking-wider"
            />
            <button
              type="button"
              onClick={() => setPhone((p) => p.slice(0, -1))}
              disabled={!phone}
              aria-label="Delete last digit"
              className="grid size-12 shrink-0 place-items-center rounded-2xl text-muted-foreground transition hover:bg-muted disabled:opacity-30"
            >
              <Delete className="size-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPhone((p) => p + key)}
                aria-label={`Key ${key}`}
                className="h-14 rounded-2xl bg-muted/60 font-mono text-xl font-semibold text-foreground transition hover:bg-muted active:scale-95"
              >
                {key}
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isDialing || !phone.trim()}
              aria-label={isDialing ? "Dialing" : "Call"}
              className="grid size-16 place-items-center rounded-full bg-[#22C55E] text-black shadow-[0_12px_30px_rgba(34,197,94,0.35)] transition hover:scale-105 active:scale-95 disabled:opacity-40"
            >
              <PhoneCall className={`size-7 ${isDialing ? "animate-pulse" : ""}`} />
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState, type FormEvent } from "react";
import { PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dialNumberApi, type DialResult } from "./telephony-service";

interface QuickDialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDialed: (phone: string, result: DialResult) => void;
}

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick dial</DialogTitle>
          <DialogDescription>
            Enter a number to call. If it matches one of your leads, the call is linked to that
            lead.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="tel"
            inputMode="tel"
            autoFocus
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="082 123 4567"
            aria-label="Phone number"
          />
          <DialogFooter>
            <Button type="submit" disabled={isDialing || !phone.trim()} className="gap-2">
              <PhoneCall />
              {isDialing ? "Dialing..." : "Call"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

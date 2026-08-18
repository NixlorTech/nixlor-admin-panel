"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RenewLicenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  onConfirm: (input: { durationInDays: number; customPrice: number }) => void | Promise<void>;
};

export function RenewLicenseDialog({
  open,
  onOpenChange,
  isPending = false,
  onConfirm,
}: RenewLicenseDialogProps) {
  const [durationInDays, setDurationInDays] = useState("365");
  const [customPrice, setCustomPrice] = useState("10000");
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    const duration = Number(durationInDays);
    const price = Number(customPrice);
    if (!Number.isFinite(duration) || duration < 1) {
      setError("Duration must be a positive number.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError("Price must be a non-negative number.");
      return;
    }
    setError("");
    await onConfirm({ durationInDays: duration, customPrice: price });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renew License</DialogTitle>
          <DialogDescription>
            Extend validity and record a renewal transaction.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="renew-days">Duration (days)</Label>
            <Input
              id="renew-days"
              type="number"
              min={1}
              value={durationInDays}
              onChange={(e) => setDurationInDays(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="renew-price">Renewal price (₹)</Label>
            <Input
              id="renew-price"
              type="number"
              min={0}
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Renewing…" : "Renew License"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

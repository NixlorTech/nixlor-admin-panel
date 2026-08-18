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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ReasonConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  reasonLabel?: string;
  confirmLabel?: string;
  destructive?: boolean;
  isPending?: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
};

export function ReasonConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  reasonLabel = "Reason",
  confirmLabel = "Confirm",
  destructive = false,
  isPending = false,
  onConfirm,
}: ReasonConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setError("");
    await onConfirm(reason.trim());
    setReason("");
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReason("");
      setError("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason-input">{reasonLabel}</Label>
          <Textarea
            id="reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter a clear reason for this action…"
            rows={3}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Submitting…" : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

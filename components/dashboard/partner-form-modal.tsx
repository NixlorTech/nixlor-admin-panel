"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import type { AlliancePartnerRecord } from "@/lib/domain-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreatePartnerMutation,
  useUpdatePartnerMutation,
} from "@/lib/hooks/use-dashboard-mutations";

type PartnerFormFieldsProps = {
  partner?: AlliancePartnerRecord | null;
  onClose: () => void;
};

function PartnerFormFields({ partner, onClose }: PartnerFormFieldsProps) {
  const isEdit = Boolean(partner);
  const [name, setName] = useState(partner?.name ?? "");
  const [contactEmail, setContactEmail] = useState(partner?.contactEmail ?? "");
  const [phone, setPhone] = useState(partner?.phone ?? "");
  const [region, setRegion] = useState(partner?.region ?? "");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(
    partner?.status ?? "ACTIVE",
  );
  const [error, setError] = useState("");

  const createPartnerMutation = useCreatePartnerMutation();
  const updatePartnerMutation = useUpdatePartnerMutation();
  const isPending =
    createPartnerMutation.isPending || updatePartnerMutation.isPending;

  const handleSubmit = useCallback(async () => {
    setError("");

    try {
      if (!name.trim() || !contactEmail.trim() || !region.trim()) {
        throw new Error("Name, contact email, and region are required");
      }

      const payload = {
        name: name.trim(),
        contactEmail: contactEmail.trim(),
        phone: phone.trim() || undefined,
        region: region.trim(),
        status,
      };

      if (isEdit) {
        await updatePartnerMutation.mutateAsync({
          id: partner!.id,
          ...payload,
        });
      } else {
        await createPartnerMutation.mutateAsync(payload);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [
    contactEmail,
    createPartnerMutation,
    isEdit,
    name,
    onClose,
    partner,
    phone,
    region,
    status,
    updatePartnerMutation,
  ]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? "Edit Alliance Partner" : "Add Alliance Partner"}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update partner profile and commission tracking details."
            : "Register a new alliance partner for client and revenue attribution."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="partnerName">Partner Name</Label>
          <Input
            id="partnerName"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partnerEmail">Contact Email</Label>
          <Input
            id="partnerEmail"
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="partnerPhone">Phone</Label>
            <Input
              id="partnerPhone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="partnerRegion">Region</Label>
            <Input
              id="partnerRegion"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="partnerStatus">Status</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as "ACTIVE" | "INACTIVE")
            }
          >
            <SelectTrigger id="partnerStatus">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button onClick={handleSubmit} disabled={isPending} className="w-full">
          {isPending
            ? "Saving..."
            : isEdit
              ? "Update Partner"
              : "Create Partner"}
        </Button>
      </div>
    </>
  );
}

type PartnerFormModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  partner?: AlliancePartnerRecord | null;
  trigger?: React.ReactNode;
};

export function PartnerFormModal({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  partner,
  trigger,
}: PartnerFormModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const content = (
    <DialogContent>
      <PartnerFormFields
        key={partner?.id ?? "create"}
        partner={partner}
        onClose={() => setOpen(false)}
      />
    </DialogContent>
  );

  if (partner) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {content}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            Add Partner
          </Button>
        )}
      </DialogTrigger>
      {content}
    </Dialog>
  );
}

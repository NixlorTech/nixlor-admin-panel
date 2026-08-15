"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useCreateModuleMutation } from "@/lib/hooks/use-dashboard-mutations";

export function AddModuleModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("0");
  const [error, setError] = useState("");

  const createModuleMutation = useCreateModuleMutation();

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setBasePrice("0");
    setError("");
  }, []);

  const handleSubmit = useCallback(async () => {
    setError("");

    try {
      const price = Number(basePrice);
      if (!name.trim()) {
        throw new Error("Module name is required");
      }
      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Base price must be a non-negative number");
      }

      await createModuleMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        basePrice: price,
      });

      setOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [basePrice, createModuleMutation, description, name, resetForm]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        resetForm();
      }
    },
    [resetForm],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add Module
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Software Module</DialogTitle>
          <DialogDescription>
            Register a new product in the Nixlor ecosystem with its base pricing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="moduleName">Module Name</Label>
            <Input
              id="moduleName"
              placeholder="e.g. VMS"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="moduleDescription">Description</Label>
            <Textarea
              id="moduleDescription"
              placeholder="Brief product description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="basePrice">Base Price (₹)</Label>
            <Input
              id="basePrice"
              type="number"
              min={0}
              step={1}
              value={basePrice}
              onChange={(event) => setBasePrice(event.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button
            onClick={handleSubmit}
            disabled={createModuleMutation.isPending}
            className="w-full"
          >
            {createModuleMutation.isPending ? "Creating..." : "Create Module"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

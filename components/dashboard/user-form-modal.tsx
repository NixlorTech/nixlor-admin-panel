"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { AdminUserRecord } from "@/lib/domain-types";
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
import { Badge } from "@/components/ui/badge";
import {
  useCreateUserMutation,
  useUpdateUserMutation,
} from "@/lib/hooks/use-dashboard-mutations";
import { useRolesQuery } from "@/lib/hooks/use-roles";

type UserFormFieldsProps = {
  user?: AdminUserRecord | null;
  onClose: () => void;
};

function UserFormFields({ user, onClose }: UserFormFieldsProps) {
  const isEdit = Boolean(user);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(user?.role.id ?? "");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [error, setError] = useState("");

  const { data: roles = [], isLoading: rolesLoading } = useRolesQuery();
  const createUserMutation = useCreateUserMutation();
  const updateUserMutation = useUpdateUserMutation();

  const selectedRoleId = roleId || roles[0]?.id || "";

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId),
    [roles, selectedRoleId],
  );

  const isPending =
    createUserMutation.isPending || updateUserMutation.isPending;

  const handleSubmit = useCallback(async () => {
    setError("");

    try {
      if (!email.trim() || !selectedRoleId) {
        throw new Error("Email and role are required");
      }

      if (!isEdit && !password) {
        throw new Error("Password is required for new users");
      }

      if (!isEdit && password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      if (isEdit && password && password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      if (isEdit) {
        await updateUserMutation.mutateAsync({
          id: user!.id,
          email: email.trim(),
          name: name.trim() || undefined,
          roleId: selectedRoleId,
          isActive,
          password: password || undefined,
        });
      } else {
        await createUserMutation.mutateAsync({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
          roleId: selectedRoleId,
        });
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [
    createUserMutation,
    email,
    isActive,
    isEdit,
    name,
    onClose,
    password,
    selectedRoleId,
    updateUserMutation,
    user,
  ]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit User" : "Add User"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update account details, role assignment, and access status."
            : "Create a new admin user and assign a role with permissions."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="userName">Full Name</Label>
          <Input
            id="userName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Optional display name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="userEmail">Email</Label>
          <Input
            id="userEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="userPassword">
            {isEdit ? "New Password" : "Password"}
          </Label>
          <Input
            id="userPassword"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isEdit ? "Leave blank to keep current password" : ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="userRole">Role</Label>
          <Select
            value={selectedRoleId}
            onValueChange={setRoleId}
            disabled={rolesLoading}
          >
            <SelectTrigger id="userRole">
              <SelectValue
                placeholder={rolesLoading ? "Loading roles..." : "Select role"}
              />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRole ? (
            <p className="text-xs text-zinc-500">{selectedRole.description}</p>
          ) : null}
        </div>

        {selectedRole ? (
          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              {selectedRole.permissions.map((permission) => (
                <Badge key={permission.id} variant="secondary">
                  {permission.name}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {isEdit ? (
          <div className="space-y-2">
            <Label htmlFor="userStatus">Status</Label>
            <Select
              value={isActive ? "ACTIVE" : "INACTIVE"}
              onValueChange={(value) => setIsActive(value === "ACTIVE")}
            >
              <SelectTrigger id="userStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button onClick={handleSubmit} disabled={isPending} className="w-full">
          {isPending ? "Saving..." : isEdit ? "Update User" : "Create User"}
        </Button>
      </div>
    </>
  );
}

type UserFormModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  user?: AdminUserRecord | null;
  trigger?: React.ReactNode;
};

export function UserFormModal({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  user,
  trigger,
}: UserFormModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const content = (
    <DialogContent className="max-w-2xl">
      <UserFormFields
        key={user?.id ?? "create"}
        user={user}
        onClose={() => setOpen(false)}
      />
    </DialogContent>
  );

  if (user) {
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
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        )}
      </DialogTrigger>
      {content}
    </Dialog>
  );
}

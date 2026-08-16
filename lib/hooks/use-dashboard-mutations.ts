"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useRevokeLicenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (licenseId: string) =>
      fetchJson(`/api/licenses/${licenseId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REVOKED" }),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.clients.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics }),
      ]);
    },
  });
}

type CreateClientInput = {
  businessName: string;
  contactEmail: string;
  phone?: string;
  region?: string;
  alliancePartnerId?: string;
};

export function useCreateClientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateClientInput) =>
      fetchJson<{ id: string }>("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.clients.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics }),
      ]);
    },
  });
}

type GenerateLicenseInput = {
  clientId: string;
  softwareModuleId: string;
  durationInDays: number;
  customPrice: number;
  commissionRate?: number;
};

export function useGenerateLicenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: GenerateLicenseInput) =>
      fetchJson<{ token: string }>("/api/licenses/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.clients.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics }),
        queryClient.invalidateQueries({ queryKey: queryKeys.partners.all }),
      ]);
    },
  });
}

type CreatePartnerInput = {
  name: string;
  contactEmail: string;
  phone?: string;
  region: string;
  status?: "ACTIVE" | "INACTIVE";
};

export function useCreatePartnerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePartnerInput) =>
      fetchJson("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
    },
  });
}

type UpdatePartnerInput = CreatePartnerInput & { id: string };

export function useUpdatePartnerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdatePartnerInput) =>
      fetchJson(`/api/partners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
    },
  });
}

type CreateModuleInput = {
  name: string;
  description?: string;
  basePrice: number;
};

export function useCreateModuleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateModuleInput) =>
      fetchJson("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.modules.all });
    },
  });
}

type CreateUserInput = {
  email: string;
  password: string;
  name?: string;
  roleId: string;
};

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUserInput) =>
      fetchJson("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

type UpdateUserInput = {
  id: string;
  email?: string;
  password?: string;
  name?: string;
  roleId?: string;
  isActive?: boolean;
};

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateUserInput) =>
      fetchJson(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useDeactivateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/users/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useResetHardwareMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (licenseId: string) =>
      fetchJson(`/api/licenses/${licenseId}/hardware`, {
        method: "PATCH",
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.clients.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.partners.all }),
      ]);
      router.refresh();
    },
  });
}

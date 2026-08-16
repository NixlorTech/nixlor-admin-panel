"use client";

import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { USER_DEACTIVATED_ERROR } from "@/lib/auth-errors";

let deactivationHandled = false;

async function handleDeactivatedUser() {
  if (deactivationHandled) {
    return;
  }

  deactivationHandled = true;
  toast.error("Your account has been deactivated. You have been logged out.");
  await signOut({ callbackUrl: "/login?deactivated=1" });
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    if (
      response.status === 401 &&
      payload?.error === USER_DEACTIVATED_ERROR
    ) {
      await handleDeactivatedUser();
      throw new Error(USER_DEACTIVATED_ERROR);
    }

    throw new Error(payload?.error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

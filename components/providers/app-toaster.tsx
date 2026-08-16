"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      closeButton
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50",
          description: "text-zinc-500",
          error: "border-red-200 dark:border-red-900",
        },
      }}
    />
  );
}

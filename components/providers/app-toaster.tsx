"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      closeButton
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "border border-border bg-white text-navy",
          description: "text-muted",
          error: "border-red-200",
        },
      }}
    />
  );
}

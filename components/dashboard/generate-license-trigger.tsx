"use client";

import dynamic from "next/dynamic";

const GenerateLicenseModal = dynamic(
  () =>
    import("@/components/dashboard/generate-license-modal").then(
      (module) => module.GenerateLicenseModal,
    ),
  {
    loading: () => (
      <div className="h-10 w-36 animate-pulse rounded-md bg-navy/10" />
    ),
    ssr: false,
  },
);

export function GenerateLicenseTrigger() {
  return <GenerateLicenseModal />;
}

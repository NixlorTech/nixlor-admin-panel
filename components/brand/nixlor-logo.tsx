import Image from "next/image";
import { cn } from "@/lib/utils";

type NixlorLogoProps = {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "on-dark";
};

const imageSizes = {
  sm: 28,
  md: 36,
  lg: 52,
} as const;

export function NixlorLogo({
  className,
  showText = true,
  size = "md",
  variant = "default",
}: NixlorLogoProps) {
  const px = imageSizes[size];
  const onDark = variant === "on-dark";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/logo.png"
        alt="Nixlor"
        width={px}
        height={px}
        className="shrink-0"
        priority
      />
      {showText ? (
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-sm font-semibold",
              onDark ? "text-white" : "text-navy",
            )}
          >
            Nixlor Admin Hub
          </p>
          <p
            className={cn(
              "truncate text-xs",
              onDark ? "text-sidebar-muted" : "text-muted",
            )}
          >
            License Generation CRM
          </p>
        </div>
      ) : null}
    </div>
  );
}

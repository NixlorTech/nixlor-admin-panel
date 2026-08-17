import { cn } from "@/lib/utils";

type TableContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export function TableContainer({ children, className }: TableContainerProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-border bg-white",
        className,
      )}
    >
      {children}
    </div>
  );
}

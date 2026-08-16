import { cn } from "@/lib/utils";

type TableContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export function TableContainer({ children, className }: TableContainerProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800",
        className,
      )}
    >
      {children}
    </div>
  );
}

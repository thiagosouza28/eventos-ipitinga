import { cn } from "@/lib/utils/cn";

type BaseCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function BaseCard({ children, className }: BaseCardProps) {
  return (
    <div
      className={cn(
        "border border-[color:var(--border-card)] bg-[color:var(--card)] p-5 text-[color:var(--text)] shadow-[var(--card-shadow)] transition-shadow sm:p-7",
        "rounded-[var(--card-radius)]",
        className
      )}
    >
      {children}
    </div>
  );
}

import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export const Card = ({ children, className }: CardProps) => (
  <div
    className={`rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--card-bg)] p-5 shadow-card ${className ?? ""}`}
  >
    {children}
  </div>
);

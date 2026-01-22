import type { ReactNode } from "react";

type PrimaryButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
};

export const PrimaryButton = ({
  children,
  onClick,
  disabled,
  className,
  type = "button"
}: PrimaryButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--primary)] px-5 py-4 text-base font-semibold text-white shadow-soft transition hover:bg-[color:var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
  >
    {children}
  </button>
);

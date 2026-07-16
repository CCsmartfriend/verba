import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChipVariant = "filled" | "outline" | "ghost";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ChipVariant;
  active?: boolean;
  children: ReactNode;
}

export function Chip({
  variant = "ghost",
  active = false,
  className,
  children,
  ...props
}: ChipProps) {
  return (
    <button
      className={cn(
        "text-[13px] font-medium py-[7px] px-4 rounded-full whitespace-nowrap transition-all duration-150",
        "hover:scale-[1.03] active:scale-100",
        variant === "filled" &&
          (active
            ? "bg-coral-hover text-white"
            : "bg-coral text-white hover:bg-coral-hover"),
        variant === "outline" &&
          (active
            ? "bg-coral text-white border border-coral"
            : "bg-transparent text-coral border-[1.5px] border-coral hover:bg-coral-light"),
        variant === "ghost" &&
          (active
            ? "bg-coral-light text-coral"
            : "bg-transparent text-ink-secondary hover:bg-coral-light"),
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

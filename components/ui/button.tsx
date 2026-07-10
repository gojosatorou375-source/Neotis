"use client";

import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-full font-black tracking-wide uppercase transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none select-none border-2 border-black active:translate-y-0 active:shadow-none hover:-translate-y-0.5",
  {
    variants: {
      variant: {
        primary:
          "bg-[#B8FF33] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#a6eb2a]",
        ghost:
          "bg-transparent text-black border-transparent hover:bg-black/5 dark:hover:bg-white/5 hover:translate-y-0 hover:shadow-none active:translate-y-0",
        glass:
          "bg-white text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-slate-50",
      },
      size: {
        sm: "h-9 px-4 text-[11px]",
        md: "h-11 px-5 text-xs",
        lg: "h-13 px-7 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref">,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

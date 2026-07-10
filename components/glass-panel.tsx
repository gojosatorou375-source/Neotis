"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export interface GlassPanelProps extends HTMLMotionProps<"div"> {
  floating?: boolean;
}

/**
 * Core frosted-glass surface used across PersonaMD.
 * Semi-transparent, blurred, soft-bordered, soft-shadowed.
 */
export function GlassPanel({
  className,
  floating = false,
  children,
  ...props
}: GlassPanelProps) {
  return (
    <motion.div
      className={cn(
        "glass-panel rounded-xl3",
        floating && "animate-float",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

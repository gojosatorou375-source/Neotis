import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full resize-none rounded-2xl border bg-white/40 dark:bg-white/5 px-5 py-4 text-body text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none transition-all duration-200",
          "border-[var(--border)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/15",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

import type { ConversationStatus } from "@/types/recovery";
import { cn } from "@/lib/utils";

const STYLES: Record<ConversationStatus, string> = {
  Completed: "bg-[var(--success)]/15 text-[var(--success)]",
  "In Progress": "bg-[var(--accent)]/15 text-[var(--accent)]",
  Pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  Archived: "bg-black/10 text-[var(--text-secondary)] dark:bg-white/10",
};

export function StatusBadge({ status }: { status: ConversationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        STYLES[status]
      )}
    >
      {status}
    </span>
  );
}

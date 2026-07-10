import type { Conversation } from "@/types/recovery";
import type { TimelineBucket, TimelineBucketKey } from "@/types/atlas";

const DAY_MS = 1000 * 60 * 60 * 24;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function bucketFor(createdAt: string, now: Date): TimelineBucketKey {
  const created = startOfDay(new Date(createdAt));
  const today = startOfDay(now);
  const diffDays = Math.round((today.getTime() - created.getTime()) / DAY_MS);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "This Week";
  if (diffDays <= 31) return "This Month";
  return "Earlier";
}

const BUCKET_ORDER: TimelineBucketKey[] = ["Today", "Yesterday", "This Week", "This Month", "Earlier"];

/** Groups conversations chronologically, newest first within each bucket. */
export function buildTimeline(conversations: Conversation[], now: Date = new Date()): TimelineBucket[] {
  const grouped = new Map<TimelineBucketKey, Conversation[]>();
  for (const key of BUCKET_ORDER) grouped.set(key, []);

  for (const c of conversations) {
    if (c.archived) continue;
    const key = bucketFor(c.createdAt, now);
    grouped.get(key)!.push(c);
  }

  return BUCKET_ORDER.filter((key) => grouped.get(key)!.length > 0).map((key) => ({
    key,
    conversationIds: grouped
      .get(key)!
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((c) => c.id),
  }));
}

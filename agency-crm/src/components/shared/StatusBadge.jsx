import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  New: "bg-blue-500/15 text-blue-700 border-blue-200 dark:text-blue-300",
  Contacted: "bg-amber-500/15 text-amber-700 border-amber-200 dark:text-amber-300",
  "Follow-Up": "bg-purple-500/15 text-purple-700 border-purple-200 dark:text-purple-300",
  Interested: "bg-cyan-500/15 text-cyan-700 border-cyan-200 dark:text-cyan-300",
  Converted: "bg-emerald-500/15 text-emerald-700 border-emerald-200 dark:text-emerald-300",
  Junk: "bg-rose-500/15 text-rose-700 border-rose-200 dark:text-rose-300",
};

export function StatusBadge({ status }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium px-2.5 py-0.5 text-xs rounded-full",
        STATUS_STYLES[status] || "bg-muted text-muted-foreground"
      )}
    >
      {status}
    </Badge>
  );
}
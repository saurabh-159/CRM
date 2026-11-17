import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function LeadsSkeleton() {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="space-y-2.5 pt-2">
        {[1, 2, 3, 4, 5, 6].map((row) => (
          <div key={row} className="flex items-center justify-between border-b pb-3">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-4 w-32 hidden md:block" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </Card>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Users,
  Sparkles,
  CheckCircle2,
  Building2,
  ArrowRight,
  History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCards } from "@/components/shared/StatsCards";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => setData(json))
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats || {};
  const user = data?.user;

  const kpiItems = [
    {
      title: "Total Leads",
      value: stats.totalLeads ?? 0,
      subtitle: "Across accessible scope",
      icon: Users,
    },
    {
      title: "New Leads",
      value: stats.newLeads ?? 0,
      subtitle: "Awaiting first contact",
      icon: Sparkles,
    },
    {
      title: "Converted",
      value: stats.convertedLeads ?? 0,
      subtitle: `${stats.interestedLeads ?? 0} currently interested`,
      icon: CheckCircle2,
    },
    {
      title: user?.role === "USER" ? "Interested Pipeline" : "Active Companies",
      value: user?.role === "USER" ? stats.interestedLeads ?? 0 : stats.totalCompanies ?? 0,
      subtitle:
        user?.role === "SUPER_ADMIN"
          ? `${stats.totalAdmins ?? 0} Admins • ${stats.totalUsers ?? 0} Users`
          : "Scoped workspace",
      icon: Building2,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {loading ? "Loading workspace..." : `Welcome, ${user?.name}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time snapshot of your leads, campaigns, and team activity.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 w-fit">
          <Link href="/leads">
            <span>Open Leads</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <StatsCards items={kpiItems} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Incoming Leads</CardTitle>
            <Link href="/leads" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : data?.recentLeads?.length ? (
              <div className="space-y-3">
                {data.recentLeads.map((lead) => (
                  <div
                    key={lead._id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.companyId?.name} • {lead.phone || lead.email || lead.source}
                      </p>
                    </div>
                    <StatusBadge status={lead.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">
                No leads received yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Timeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <span>Recent Activity Logs</span>
            </CardTitle>
            {user?.role !== "USER" && (
              <Link href="/activity-logs" className="text-xs text-primary hover:underline">
                Full audit log
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : data?.recentLogs?.length ? (
              <div className="space-y-3">
                {data.recentLogs.map((log) => (
                  <div key={log._id} className="rounded-lg border p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {log.actionType}
                      </Badge>
                      <span className="text-muted-foreground">
                        {format(new Date(log.createdAt), "dd MMM, hh:mm a")}
                      </span>
                    </div>
                    <p className="text-foreground/90">{log.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">
                No activity recorded yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
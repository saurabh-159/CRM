"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ROLE_FILTERS = [
  { value: "ALL", label: "All Roles" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "USER", label: "User" },
];

function roleBadgeLabel(role) {
  return String(role || "").replaceAll("_", " ");
}

function LogRow({ log, expanded, onToggle }) {
  const companyName = log.companyId?.name;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-start gap-3"
      >
        <span className="mt-0.5 text-muted-foreground shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono">
              {log.actionType}
            </Badge>
            <span className="text-xs font-semibold truncate">
              {log.actorName}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {roleBadgeLabel(log.actorRole)}
            </Badge>
            {companyName && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {companyName}
              </Badge>
            )}
          </div>

          <p
            className={cn(
              "text-sm text-foreground/90",
              !expanded && "line-clamp-1"
            )}
          >
            {log.description}
          </p>
        </div>

        <span className="text-[11px] text-muted-foreground shrink-0 pt-0.5 hidden sm:block">
          {format(new Date(log.createdAt), "dd MMM yyyy, hh:mm a")}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 pl-11 space-y-2 bg-muted/20">
          <p className="text-xs text-muted-foreground sm:hidden">
            {format(new Date(log.createdAt), "dd MMM yyyy, hh:mm:ss a")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <div className="rounded-md border bg-background px-3 py-2">
              <p className="text-muted-foreground mb-0.5">Actor</p>
              <p className="font-medium">
                {log.actorName} · {roleBadgeLabel(log.actorRole)}
              </p>
            </div>
            <div className="rounded-md border bg-background px-3 py-2">
              <p className="text-muted-foreground mb-0.5">Company</p>
              <p className="font-medium">{companyName || "System / Global"}</p>
            </div>
            <div className="rounded-md border bg-background px-3 py-2 sm:col-span-2">
              <p className="text-muted-foreground mb-0.5">Full details</p>
              <p className="font-medium leading-relaxed">{log.description}</p>
            </div>
            <div className="rounded-md border bg-background px-3 py-2 sm:col-span-2">
              <p className="text-muted-foreground mb-0.5">Timestamp</p>
              <p className="font-medium">
                {format(new Date(log.createdAt), "EEEE, dd MMM yyyy · hh:mm:ss a")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => setCompanies(data.companies || []));
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (companyFilter !== "ALL") params.set("companyId", companyFilter);
      if (roleFilter !== "ALL") params.set("actorRole", roleFilter);

      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setExpandedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [companyFilter, roleFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const allExpanded = useMemo(
    () => logs.length > 0 && expandedIds.size === logs.length,
    [logs, expandedIds]
  );

  function toggleOne(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allExpanded) {
      setExpandedIds(new Set());
      return;
    }
    setExpandedIds(new Set(logs.map((log) => log._id)));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">System Activity & Audit Logs</h2>
          <p className="text-sm text-muted-foreground">
            Super Admin only — filter by role or company, expand a row for full detail.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_FILTERS.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchLogs} title="Refresh logs">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3 py-3 px-4 border-b bg-muted/30">
          <CardTitle className="text-sm font-semibold">
            {loading ? "Loading logs…" : `${logs.length} log${logs.length === 1 ? "" : "s"}`}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={toggleAll}
            disabled={!logs.length || loading}
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            {allExpanded ? "Collapse all" : "Expand all"}
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-0 p-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg mb-2 last:mb-0" />
              ))}
            </div>
          ) : logs.length ? (
            <div className="max-h-[min(70vh,640px)] overflow-y-auto">
              {logs.map((log) => (
                <LogRow
                  key={log._id}
                  log={log}
                  expanded={expandedIds.has(log._id)}
                  onToggle={() => toggleOne(log._id)}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center px-4">
              <p className="text-sm font-medium">No activity logs found for this filter.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try another role or company, or refresh after new actions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

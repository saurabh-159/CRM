"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

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

      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } finally {
      setLoading(false);
    }
  }, [companyFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">System Activity & Audit Logs</h2>
          <p className="text-sm text-muted-foreground">
            Complete timelog of who created records, assigned admins, and updated leads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Filter by Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Accessible Logs</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : logs.length ? (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log._id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[11px]">
                      {log.actionType}
                    </Badge>
                    <span className="text-xs font-semibold">
                      {log.actorName} ({log.actorRole})
                    </span>
                    {log.companyId?.name && (
                      <Badge variant="secondary" className="text-[11px]">
                        {log.companyId.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground/90">{log.description}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(log.createdAt), "dd MMM yyyy, hh:mm:ss a")}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-sm font-medium">No activity logs found for this filter.</p>
        </Card>
      )}
    </div>
  );
}
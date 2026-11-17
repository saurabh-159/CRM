"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Eye, Phone, Mail } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";

export function LeadsTable({ leads, showCompanyColumn = false }) {
  if (!leads.length) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-sm font-medium">No leads match your current filters.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Try clearing filters or send a test lead via your company webhook API.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-[var(--brand-cream)]/60 hover:bg-[var(--brand-cream)]/60">
            <TableHead>Lead Details</TableHead>
            {showCompanyColumn && <TableHead>Company</TableHead>}
            <TableHead>Source / Campaign</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Notes</TableHead>
            <TableHead className="hidden lg:table-cell">Received</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow
              key={lead._id}
              className="bg-[var(--brand-white)] hover:bg-[var(--brand-cream)]/40 transition-colors"
            >
              <TableCell>
                <p className="font-medium text-sm">{lead.name}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {lead.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {lead.phone}
                    </span>
                  )}
                  {lead.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {lead.email}
                    </span>
                  )}
                </div>
              </TableCell>

              {showCompanyColumn && (
                <TableCell>
                  <Badge variant="secondary" className="font-normal">
                    {lead.companyId?.name || "—"}
                  </Badge>
                </TableCell>
              )}

              <TableCell>
                <p className="text-xs font-medium">{lead.source || "Meta Ads"}</p>
                {lead.campaignName && (
                  <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                    {lead.campaignName}
                  </p>
                )}
              </TableCell>

              <TableCell>
                <StatusBadge status={lead.status} />
              </TableCell>

              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                {lead.notes?.length ? `${lead.notes.length} note(s)` : "No notes"}
              </TableCell>

              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                {format(new Date(lead.createdAt), "dd MMM, hh:mm a")}
              </TableCell>

              <TableCell className="text-right">
                <Button size="sm" variant="outline" asChild className="gap-1.5">
                  <Link href={`/leads/${lead._id}`}>
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
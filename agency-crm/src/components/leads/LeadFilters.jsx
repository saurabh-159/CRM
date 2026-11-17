"use client";

import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = ["ALL", "New", "Contacted", "Follow-Up", "Interested", "Converted", "Junk"];

export function LeadFilters({
  filters,
  onChange,
  onReset,
  companies = [],
  showCompanyFilter = false,
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-[var(--brand-cream)]/60 p-4 rounded-xl border border-border">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, phone, email, campaign..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2.5 items-center">
        {showCompanyFilter && (
          <Select
            value={filters.companyId}
            onValueChange={(val) => onChange({ ...filters, companyId: val })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Companies" />
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
        )}

        <Select
          value={filters.status}
          onValueChange={(val) => onChange({ ...filters, status: val })}
        >
          <SelectTrigger className="w-[155px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "ALL" ? "All Statuses" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={filters.from}
          onChange={(e) => onChange({ ...filters, from: e.target.value })}
          className="w-[150px]"
          title="From Date"
        />

        <Input
          type="date"
          value={filters.to}
          onChange={(e) => onChange({ ...filters, to: e.target.value })}
          className="w-[150px]"
          title="To Date"
        />

        <Button variant="ghost" size="icon" onClick={onReset} title="Reset Filters">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
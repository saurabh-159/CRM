"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadFilters } from "@/components/leads/LeadFilters";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadDetailSheet } from "@/components/leads/LeadDetailSheet";
import { LeadsSkeleton } from "@/components/leads/LeadsSkeleton";

const INITIAL_FILTERS = {
  search: "",
  companyId: "ALL",
  status: "ALL",
  from: "",
  to: "",
};

export default function LeadsPage() {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [leads, setLeads] = useState([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
        if (data.user?.role !== "USER") {
          fetch("/api/companies")
            .then((r) => r.json())
            .then((cData) => setCompanies(cData.companies || []));
        }
      });
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.companyId !== "ALL") params.set("companyId", filters.companyId);
      if (filters.status !== "ALL") params.set("status", filters.status);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      setLeads(data.leads || []);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  function handleLeadUpdated(updated) {
    setLeads((prev) => prev.map((l) => (l._id === updated._id ? updated : l)));
    setSelectedLead(updated);
  }

  const isMultiCompanyRole = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Leads Pipeline</h2>
          <p className="text-sm text-muted-foreground">
            Filter incoming Meta Ads & form leads, update statuses, and log follow-up notes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLeads} className="gap-1.5 w-fit">
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      <LeadFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(INITIAL_FILTERS)}
        companies={companies}
        showCompanyFilter={isMultiCompanyRole}
      />

      {loading ? (
        <LeadsSkeleton />
      ) : (
        <LeadsTable
          leads={leads}
          onSelectLead={(lead) => setSelectedLead(lead)}
          showCompanyColumn={isMultiCompanyRole}
        />
      )}

      <LeadDetailSheet
        lead={selectedLead}
        open={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        onLeadUpdated={handleLeadUpdated}
      />
    </div>
  );
}
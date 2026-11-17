"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Building2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateCompanyModal } from "@/components/admin/CreateCompanyModal";

export default function CompaniesPage() {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      setUser(meData.user);

      const compRes = await fetch("/api/companies");
      const compData = await compRes.json();
      setCompanies(compData.companies || []);

      if (meData.user?.role === "SUPER_ADMIN") {
        const admRes = await fetch("/api/admins");
        const admData = await admRes.json();
        setAdmins(admData.admins || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canCreate =
    user?.role === "SUPER_ADMIN" ||
    (user?.role === "ADMIN" && user?.permissions?.canCreateCompany);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Client Companies</h2>
          <p className="text-sm text-muted-foreground">
            Browse companies and open a company to manage webhooks, sync, and admins.
          </p>
        </div>

        {canCreate && (
          <CreateCompanyModal
            admins={admins}
            isSuperAdmin={user?.role === "SUPER_ADMIN"}
            onCreated={loadData}
          />
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : companies.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map((company) => (
            <Card key={company._id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{company.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {company.industry || "General"} • {company.leadCount || 0} Leads
                      </p>
                    </div>
                  </div>
                  <Badge variant={company.isActive ? "default" : "secondary"}>
                    {company.isActive ? "Active" : "Paused"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="mt-auto space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    Assigned Admins
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {company.assignedAdmins?.length ? (
                      company.assignedAdmins.map((adm) => (
                        <Badge key={adm._id} variant="outline" className="text-xs">
                          {adm.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No admin assigned</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button asChild size="sm" className="gap-1.5">
                    <Link href={`/companies/${company._id}`}>
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-sm font-medium">No companies found.</p>
          <p className="text-xs text-muted-foreground mt-1">
            {canCreate
              ? 'Click "New Company" above to onboard your first client.'
              : "Ask Super Admin to assign a company to your account."}
          </p>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, Check, Building2, KeyRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateCompanyModal } from "@/components/admin/CreateCompanyModal";
import { AssignAdminsModal } from "@/components/admin/AssignAdminsModal";

export default function CompaniesPage() {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

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

  function copyWebhookUrl(company) {
    const baseUrl =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const fullUrl = `${baseUrl}/api/leads/ingest?api_key=${company.webhookApiKey}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(company._id);
    toast.success("Webhook POST URL copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function regenerateKey(companyId) {
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateKey: true }),
      });
      if (!res.ok) throw new Error("Failed to regenerate key");
      toast.success("New Webhook API Key generated");
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const canCreate =
    user?.role === "SUPER_ADMIN" ||
    (user?.role === "ADMIN" && user?.permissions?.canCreateCompany);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Client Companies</h2>
          <p className="text-sm text-muted-foreground">
            Manage companies, assigned admins, and unique Meta Ads / Form webhook endpoints.
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
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : companies.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map((company) => (
            <Card key={company._id} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{company.name}</CardTitle>
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

              <CardContent className="space-y-4">
                {/* Assigned Admins */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    Assigned Admins:
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

                {/* Webhook API Key Box */}
                <div className="rounded-lg border bg-muted/40 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium flex items-center gap-1">
                      <KeyRound className="h-3.5 w-3.5 text-primary" /> Webhook Endpoint
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => copyWebhookUrl(company)}
                      >
                        {copiedId === company._id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Copy URL
                          </>
                        )}
                      </Button>
                      {user?.role === "SUPER_ADMIN" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          title="Regenerate API Key"
                          onClick={() => regenerateKey(company._id)}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground truncate">
                    POST /api/leads/ingest?api_key={company.webhookApiKey}
                  </p>
                </div>

                {user?.role === "SUPER_ADMIN" && (
                  <div className="pt-1 flex justify-end">
                    <AssignAdminsModal
                      company={company}
                      allAdmins={admins}
                      onUpdated={loadData}
                    />
                  </div>
                )}
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
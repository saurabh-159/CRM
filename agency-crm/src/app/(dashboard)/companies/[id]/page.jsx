"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Check,
  Copy,
  KeyRound,
  RefreshCw,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssignAdminsModal } from "@/components/admin/AssignAdminsModal";
import GoogleSheetSyncCard from "@/components/GoogleSheetSyncCard";

export default function CompanyDetailPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [rotating, setRotating] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      setUser(meData.user);

      const companyRes = await fetch(`/api/companies/${id}`);
      const companyData = await companyRes.json();
      if (!companyRes.ok) {
        throw new Error(companyData.error || "Failed to load company");
      }

      setCompany(companyData.company);
      setName(companyData.company.name || "");
      setIndustry(companyData.company.industry || "");
      setIsActive(Boolean(companyData.company.isActive));

      if (meData.user?.role === "SUPER_ADMIN") {
        const admRes = await fetch("/api/admins");
        const admData = await admRes.json();
        setAdmins(admData.admins || []);
      }
    } catch (err) {
      setError(err.message);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function copyWebhookUrl() {
    if (!company?.webhookApiKey) return;
    const baseUrl =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const fullUrl = `${baseUrl}/api/leads/ingest?api_key=${company.webhookApiKey}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success("Webhook POST URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRotateDialogChange(open) {
    setRotateOpen(open);
    if (!open) {
      setConfirmText("");
      setRotating(false);
    }
  }

  async function confirmRegenerateKey() {
    if (confirmText.trim().toUpperCase() !== "CHANGE") return;

    setRotating(true);
    try {
      const res = await fetch(`/api/companies/${company._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateKey: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to regenerate key");
      toast.success("New Webhook API Key generated");
      setCompany(data.company);
      handleRotateDialogChange(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRotating(false);
    }
  }

  async function handleSaveDetails(e) {
    e.preventDefault();
    if (!company) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${company._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          industry,
          isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update company");

      toast.success("Company details updated");
      setCompany(data.company);
      setName(data.company.name || "");
      setIndustry(data.company.industry || "");
      setIsActive(Boolean(data.company.isActive));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const canConfirmRotate = confirmText.trim().toUpperCase() === "CHANGE";
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canManageSheets = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" size="sm" asChild className="w-fit gap-1.5">
          <Link href="/companies">
            <ArrowLeft className="h-4 w-4" />
            Back to companies
          </Link>
        </Button>

        {isSuperAdmin && company && (
          <AssignAdminsModal company={company} allAdmins={admins} onUpdated={loadData} />
        )}
      </div>

      {loading ? (
        <CompanyDetailSkeleton />
      ) : error || !company ? (
        <Card className="p-10 text-center">
          <p className="text-sm font-medium">{error || "Company not found."}</p>
          <p className="text-xs text-muted-foreground mt-1">
            This company may have been removed, or you do not have access to it.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-xl truncate">{company.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
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

              {isSuperAdmin && (
                <form
                  onSubmit={handleSaveDetails}
                  className="space-y-4 rounded-lg border bg-muted/30 p-4"
                >
                  <div>
                    <h3 className="text-sm font-semibold">Edit Company</h3>
                    <p className="text-xs text-muted-foreground">
                      Update name, niche, and active status for this client.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="company-name">Company Name</Label>
                      <Input
                        id="company-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="company-industry">Industry / Niche</Label>
                      <Input
                        id="company-industry"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        placeholder="e.g. Tours & Travel"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 max-w-xs">
                    <Label>Status</Label>
                    <Select
                      value={isActive ? "active" : "paused"}
                      onValueChange={(value) => setIsActive(value === "active")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving} className="gap-1.5">
                      <Save className="h-3.5 w-3.5" />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Webhook Endpoint
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Use this unique POST URL for Meta Ads / website forms.
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={copyWebhookUrl}
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy URL
                        </>
                      )}
                    </Button>
                    {isSuperAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        title="Regenerate API Key"
                        onClick={() => setRotateOpen(true)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground break-all">
                  POST /api/leads/ingest?api_key={company.webhookApiKey}
                </p>
              </div>
            </CardContent>
          </Card>

          {canManageSheets && (
            <GoogleSheetSyncCard
              companyId={company._id}
              companyName={company.name}
            />
          )}
        </>
      )}

      <Dialog open={rotateOpen} onOpenChange={handleRotateDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Webhook API Key?</DialogTitle>
            <DialogDescription>
              Regenerating the webhook API key for{" "}
              <span className="font-semibold text-foreground">{company?.name}</span> will
              immediately break any active website forms or Meta Ads webhooks using the old
              URL until they are updated with the new key.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirm-change">
              Type <span className="font-mono font-semibold">CHANGE</span> to confirm
            </Label>
            <Input
              id="confirm-change"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="CHANGE"
              autoComplete="off"
              disabled={rotating}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleRotateDialogChange(false)}
              disabled={rotating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRegenerateKey}
              disabled={!canConfirmRotate || rotating}
            >
              {rotating ? "Regenerating…" : "Confirm & Regenerate Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompanyDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

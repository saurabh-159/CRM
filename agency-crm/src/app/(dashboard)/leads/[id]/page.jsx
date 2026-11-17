"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Building2, Code2, Mail, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";

const STATUSES = ["New", "Contacted", "Follow-Up", "Interested", "Converted", "Junk"];

export default function LeadDetailPage() {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("New");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLead() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/leads/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load lead");
        if (cancelled) return;
        setLead(data.lead);
        setStatus(data.lead.status || "New");
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) loadLead();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      toast.success("Lead updated");
      setLead(data.lead);
      setStatus(data.lead.status || "New");
      setNote("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4" />
            Back to leads
          </Link>
        </Button>
      </div>

      {loading ? (
        <LeadDetailSkeleton />
      ) : error || !lead ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-sm font-medium">{error || "Lead not found."}</p>
          <p className="text-xs text-muted-foreground mt-1">
            This lead may have been removed, or you do not have access to it.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight">{lead.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {lead.companyId?.name && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <Building2 className="h-4 w-4" /> {lead.companyId.name}
                    </span>
                  )}
                  {lead.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-4 w-4" /> {lead.phone}
                    </span>
                  )}
                  {lead.email && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-4 w-4" /> {lead.email}
                    </span>
                  )}
                </div>
              </div>
              <StatusBadge status={lead.status} />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_1fr]">
            <form onSubmit={handleSave} className="rounded-xl border bg-card p-5 space-y-4 h-fit">
              <div>
                <h3 className="text-sm font-semibold">Update lead</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Change the status and add a follow-up note.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Lead Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Add Follow-Up Note</Label>
                <Textarea
                  rows={4}
                  placeholder="Write call summary, client requirement, or next callback time..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full gap-2">
                <Send className="h-4 w-4" />
                {saving ? "Saving..." : "Save Status & Note"}
              </Button>
            </form>

            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h3 className="text-sm font-semibold">Activity & Notes History</h3>
              {lead.notes?.length ? (
                <div className="space-y-2.5">
                  {[...lead.notes].reverse().map((item, idx) => (
                    <div key={item._id || idx} className="rounded-lg border bg-muted/30 p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground mb-1">
                        <span className="font-semibold text-foreground">
                          {item.addedByName}{" "}
                          <Badge variant="outline" className="text-[10px] ml-1">
                            {item.addedByRole}
                          </Badge>
                        </span>
                        <span>{format(new Date(item.createdAt), "dd MMM, hh:mm a")}</span>
                      </div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{item.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No notes added yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Code2 className="h-4 w-4 text-primary" />
              <span>Submitted Form / Meta Ads Payload</span>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5 text-xs">
              {lead.rawPayload && Object.keys(lead.rawPayload).length > 0 ? (
                Object.entries(lead.rawPayload).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between gap-4 border-b last:border-none pb-1.5 last:pb-0"
                  >
                    <span className="font-medium text-muted-foreground">{key}:</span>
                    <span className="font-mono text-right break-all">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No extra payload fields recorded.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LeadDetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_1fr]">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

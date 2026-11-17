"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Send, Phone, Mail, Building2, Code2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";

const STATUSES = ["New", "Contacted", "Follow-Up", "Interested", "Converted", "Junk"];

export function LeadDetailSheet({ lead, open, onClose, onLeadUpdated }) {
  const [status, setStatus] = useState("New");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setStatus(lead.status);
      setNote("");
    }
  }, [lead]);

  if (!lead) return null;

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
      setNote("");
      onLeadUpdated(data.lead);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <SheetTitle className="text-lg">{lead.name}</SheetTitle>
            <StatusBadge status={lead.status} />
          </div>
          <SheetDescription className="flex flex-wrap items-center gap-3 pt-1">
            {lead.companyId?.name && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                <Building2 className="h-3.5 w-3.5" /> {lead.companyId.name}
              </span>
            )}
            {lead.phone && (
              <span className="inline-flex items-center gap-1 text-xs">
                <Phone className="h-3.5 w-3.5" /> {lead.phone}
              </span>
            )}
            {lead.email && (
              <span className="inline-flex items-center gap-1 text-xs">
                <Mail className="h-3.5 w-3.5" /> {lead.email}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSave} className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <Label>Lead Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Add Follow-Up Note</Label>
            <Textarea
              rows={3}
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

        <Separator className="my-6" />

        {/* Notes History */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Activity & Notes History</h4>
          {lead.notes?.length ? (
            <div className="space-y-2.5">
              {[...lead.notes].reverse().map((n, idx) => (
                <div key={n._id || idx} className="rounded-lg border bg-muted/30 p-3 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="font-semibold text-foreground">
                      {n.addedByName}{" "}
                      <Badge variant="outline" className="text-[10px] ml-1">
                        {n.addedByRole}
                      </Badge>
                    </span>
                    <span>{format(new Date(n.createdAt), "dd MMM, hh:mm a")}</span>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{n.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No notes added yet.</p>
          )}
        </div>

        <Separator className="my-6" />

        {/* Dynamic Meta / Form Webhook Payload */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Code2 className="h-4 w-4 text-primary" />
            <span>Submitted Form / Meta Ads Payload</span>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5 text-xs">
            {lead.rawPayload && Object.keys(lead.rawPayload).length > 0 ? (
              Object.entries(lead.rawPayload).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between gap-4 border-b last:border-none pb-1 last:pb-0"
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
      </SheetContent>
    </Sheet>
  );
}
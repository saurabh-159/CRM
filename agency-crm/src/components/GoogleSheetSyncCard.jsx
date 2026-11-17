"use client";

import { useEffect, useState } from "react";
import { Copy, Check, ExternalLink, RefreshCw, Sheet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function GoogleSheetSyncCard({ companyId, companyName, embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [sheetUrl, setSheetUrl] = useState("");
  const [linkedSheetId, setLinkedSheetId] = useState("");
  const [botEmail, setBotEmail] = useState("");
  const [masterSheetId, setMasterSheetId] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    let active = true;

    async function fetchSheetStatus() {
      setLoading(true);
      try {
        const res = await fetch(`/api/companies/${companyId}/google-sheet`);
        const data = await res.json();
        if (!active) return;

        if (res.ok) {
          setLinkedSheetId(data.company?.googleSheetId || "");
          setSheetUrl(data.company?.googleSheetId || "");
          setLastSyncedAt(data.company?.lastSyncedAt || null);
          setBotEmail(data.botEmail || "");
          setMasterSheetId(data.masterSheetId || "");
        } else {
          setStatusMsg({ type: "error", text: data.error || "Failed to load sheet status" });
        }
      } catch {
        if (active) {
          setStatusMsg({ type: "error", text: "Network error loading Google Sheet settings" });
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchSheetStatus();
    return () => {
      active = false;
    };
  }, [companyId]);

  const handleCopyBotEmail = async () => {
    if (!botEmail) return;
    try {
      await navigator.clipboard.writeText(botEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatusMsg({ type: "error", text: "Could not copy the bot email" });
    }
  };

  const handleLinkAndSync = async (e) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;

    setSaving(true);
    setStatusMsg({ type: "", text: "" });

    try {
      const res = await fetch(`/api/companies/${companyId}/google-sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl: sheetUrl.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setLinkedSheetId(data.googleSheetId);
        setLastSyncedAt(data.lastSyncedAt);
        setStatusMsg({ type: "success", text: data.message });
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to link sheet" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Network error while linking Google Sheet" });
    } finally {
      setSaving(false);
    }
  };

  const handleForceResync = async () => {
    setResyncing(true);
    setStatusMsg({ type: "", text: "" });

    try {
      const res = await fetch(`/api/companies/${companyId}/google-sheet`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceResync: true }),
      });
      const data = await res.json();

      if (res.ok) {
        setLastSyncedAt(data.lastSyncedAt);
        setStatusMsg({ type: "success", text: data.message });
      } else {
        setStatusMsg({ type: "error", text: data.error || "Re-sync failed" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Network error during re-sync" });
    } finally {
      setResyncing(false);
    }
  };

  const body = loading ? (
    <div className="space-y-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  ) : (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sheet className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Google Sheets Live Sync{companyName ? ` — ${companyName}` : ""}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            New and updated leads sync into a dedicated tab in the linked Google Sheet.
          </p>
        </div>
        <Badge variant={linkedSheetId ? "default" : "secondary"}>
          {linkedSheetId ? "Connected" : "Not Linked"}
        </Badge>
      </div>

      <div className="space-y-1.5 rounded-lg border bg-muted/40 p-3">
        <p className="text-xs font-medium text-foreground">
          Step 1: Share the sheet as Editor with this bot email
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 overflow-x-auto rounded-lg border bg-background px-2.5 py-1.5 text-xs text-foreground">
            {botEmail || "GOOGLE_CLIENT_EMAIL not configured"}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={handleCopyBotEmail}
            disabled={!botEmail}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy Email"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleLinkAndSync} className="space-y-2">
        <Label htmlFor={`sheet-url-${companyId}`} className="text-xs">
          Step 2: Paste the Google Sheet URL or Sheet ID
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={`sheet-url-${companyId}`}
            type="text"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
          <Button type="submit" size="sm" disabled={saving || !sheetUrl.trim()} className="shrink-0">
            {saving ? "Linking & Syncing..." : linkedSheetId ? "Update & Sync" : "Link & Sync Past Leads"}
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {lastSyncedAt
            ? `Last synced: ${new Date(lastSyncedAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}`
            : "Not synced yet"}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {linkedSheetId && (
            <>
              <Button variant="link" size="sm" className="h-auto px-0 text-xs" asChild>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${linkedSheetId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Client Sheet
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleForceResync}
                disabled={resyncing}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {resyncing ? "Re-syncing..." : "Force Re-Sync All"}
              </Button>
            </>
          )}

          {masterSheetId && (
            <Button variant="link" size="sm" className="h-auto px-0 text-xs" asChild>
              <a
                href={`https://docs.google.com/spreadsheets/d/${masterSheetId}/edit`}
                target="_blank"
                rel="noreferrer"
              >
                Open Agency Master Sheet
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {statusMsg.text && (
        <div
          className={
            statusMsg.type === "success"
              ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          }
        >
          {statusMsg.text}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return <div className="rounded-lg border bg-muted/40 p-3">{body}</div>;
  }

  return (
    <Card>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

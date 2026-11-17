"use client";

import { useEffect, useState } from "react";
import { Palette, RotateCcw, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyThemeColors } from "@/components/shared/ThemeInjector";
import { isHexColor, normalizeThemeColors, THEME_DEFAULTS } from "@/lib/theme";

const FIELDS = [
  {
    key: "primaryColor",
    label: "Primary Accent",
    token: "--brand-primary",
    fallback: THEME_DEFAULTS.primaryColor,
    hint: "Buttons, active sidebar items, primary badges, focus rings, and brand icons.",
  },
  {
    key: "creamColor",
    label: "Warm Surface / Sidebar",
    token: "--brand-cream",
    fallback: THEME_DEFAULTS.creamColor,
    hint: "Sidebar, top bar, table headers, filter bars, and soft highlights.",
  },
  {
    key: "whiteColor",
    label: "Main Canvas / Cards",
    token: "--brand-white",
    fallback: THEME_DEFAULTS.whiteColor,
    hint: "Workspace background, cards, table rows, dialogs, drawers, and inputs.",
  },
];

function sameTheme(a, b) {
  if (!a || !b) return false;
  return (
    a.primaryColor === b.primaryColor &&
    a.creamColor === b.creamColor &&
    a.whiteColor === b.whiteColor
  );
}

function ColorField({ field, value, onChange }) {
  const valid = isHexColor(value);

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label htmlFor={field.key}>
          {field.label}{" "}
          <span className="font-normal text-muted-foreground">
            ({field.token}, default {field.fallback})
          </span>
        </Label>
        <p className="text-xs text-muted-foreground">{field.hint}</p>
      </div>
      <div className="flex items-center gap-2.5">
        <input
          id={`${field.key}-picker`}
          type="color"
          aria-label={`${field.label} color picker`}
          value={valid ? value.toLowerCase() : field.fallback.toLowerCase()}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-input bg-[var(--brand-white)] p-1"
        />
        <Input
          id={field.key}
          value={value}
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          placeholder={field.fallback}
          onChange={(e) => {
            let next = e.target.value.toUpperCase().replace(/[^#0-9A-F]/g, "");
            if (!next.startsWith("#")) next = `#${next.replace(/#/g, "")}`;
            onChange(`#${next.slice(1, 7)}`);
          }}
          className="font-mono uppercase tracking-wide"
        />
      </div>
      {value && !valid && (
        <p className="text-xs text-destructive">Use a 6-digit hex code, like {field.fallback}.</p>
      )}
    </div>
  );
}

function ThemePreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[var(--brand-white)]">
      <div className="flex min-h-[340px]">
        <div className="flex w-36 shrink-0 flex-col gap-2 border-r border-border bg-[var(--brand-cream)] p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--brand-primary)] text-[var(--brand-white)]">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold">AgencyCRM</span>
          </div>
          <div className="rounded-lg bg-[var(--brand-primary)] px-2.5 py-2 text-xs font-medium text-[var(--brand-white)]">
            Dashboard
          </div>
          <div className="rounded-lg px-2.5 py-2 text-xs text-muted-foreground">Leads</div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-11 items-center border-b border-border bg-[var(--brand-cream)] px-3 text-xs font-semibold">
            Overview Dashboard
          </div>
          <div className="flex flex-1 flex-col gap-3 bg-[var(--brand-white)] p-3">
            <div className="rounded-lg border border-border bg-[var(--brand-white)] p-3">
              <p className="text-xs text-muted-foreground">Total Leads</p>
              <p className="text-lg font-bold tracking-tight">128</p>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="bg-[var(--brand-cream)]/60 px-3 py-2 text-[11px] font-medium">
                Lead details
              </div>
              <div className="bg-[var(--brand-white)] px-3 py-2 text-xs">Avery Shah</div>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-2">
              <Button size="sm">Primary action</Button>
              <Badge>Active</Badge>
              <Badge variant="secondary">Highlight</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThemeSettingsPage() {
  const [colors, setColors] = useState(null);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/theme")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const next = normalizeThemeColors(data) || THEME_DEFAULTS;
        setColors(next);
        setSaved(next);
      })
      .catch(() => {
        if (cancelled) return;
        setColors(THEME_DEFAULTS);
        setSaved(THEME_DEFAULTS);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!colors) return;
    applyThemeColors(colors);
  }, [colors]);

  function updateColor(key, value) {
    setColors((prev) => ({ ...prev, [key]: value }));
  }

  async function persistTheme(next, successMessage) {
    const safe = normalizeThemeColors(next);
    if (!safe) {
      toast.error("Each color must be a 6-digit hex code.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(safe),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save theme");

      const stored = normalizeThemeColors(data) || safe;
      setColors(stored);
      setSaved(stored);
      applyThemeColors(stored);
      toast.success(successMessage);
    } catch (err) {
      if (saved) {
        setColors(saved);
        applyThemeColors(saved);
      }
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const valid = Boolean(normalizeThemeColors(colors));
  const dirty = valid && saved && !sameTheme(colors, saved);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-[var(--brand-white)]">
          <Palette className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Theme Settings</h2>
          <p className="text-sm text-muted-foreground">
            Adjust the olive, cream, and white surfaces. The preview updates immediately. Save
            applies the palette for every user, including the login screen.
          </p>
        </div>
      </div>

      {!colors ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="h-96" />
          <Card className="h-96" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="bg-[var(--brand-white)]">
            <CardHeader>
              <CardTitle>Brand colors</CardTitle>
              <CardDescription>
                Keep the canvas light and use cream only where a surface needs separation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {FIELDS.map((field) => (
                <ColorField
                  key={field.key}
                  field={field}
                  value={colors[field.key]}
                  onChange={(value) => updateColor(field.key, value)}
                />
              ))}

              <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
                <Button
                  type="button"
                  disabled={saving || !valid}
                  onClick={() => persistTheme(colors, "Theme saved globally")}
                  className="gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Theme Globally"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    setColors(THEME_DEFAULTS);
                    applyThemeColors(THEME_DEFAULTS);
                    toast.success("Preview reset to Olive, Cream & White");
                  }}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Default (Olive, Cream & White)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {!valid
                  ? "Fix the hex codes before saving."
                  : dirty
                    ? "Unsaved changes are visible only in this session until you save."
                    : "The saved theme is active across the CRM."}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[var(--brand-white)]">
            <CardHeader>
              <CardTitle>Live preview</CardTitle>
              <CardDescription>
                Sidebar and header stay cream, data stays on the white canvas, and olive marks the
                active action.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemePreview />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

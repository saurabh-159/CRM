"use client";

import { useEffect } from "react";
import { THEME_DEFAULTS, normalizeThemeColors } from "@/lib/theme";

export function applyThemeColors(colors) {
  const safe = normalizeThemeColors(colors);
  if (!safe) return;

  const root = document.documentElement;
  root.style.setProperty("--brand-primary", safe.primaryColor);
  root.style.setProperty("--brand-cream", safe.creamColor);
  root.style.setProperty("--brand-white", safe.whiteColor);
}

export function ThemeInjector() {
  useEffect(() => {
    let cancelled = false;

    fetch("/api/settings/theme")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        applyThemeColors(normalizeThemeColors(data) || THEME_DEFAULTS);
      })
      .catch(() => {
        if (!cancelled) applyThemeColors(THEME_DEFAULTS);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

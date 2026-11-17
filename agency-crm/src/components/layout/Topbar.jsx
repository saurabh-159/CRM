"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MobileNav } from "./MobileNav";

const PAGE_TITLES = {
  "/dashboard": "Overview Dashboard",
  "/leads": "Leads Workspace",
  "/companies": "Companies & Webhooks",
  "/admins": "Admins & Permissions",
  "/users": "Company Users",
  "/activity-logs": "System Activity Logs",
  "/theme-settings": "Theme Settings",
};

export function Topbar({ user }) {
  const router = useRouter();
  const pathname = usePathname();

  const currentTitle = pathname.match(/^\/companies\/[^/]+$/)
    ? "Company Details"
    : Object.entries(PAGE_TITLES).find(([path]) => pathname.startsWith(path))?.[1] ||
      "CRM Workspace";

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Logged out successfully");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Failed to logout");
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-[var(--brand-cream)] px-4 md:px-8">
      <div className="flex items-center gap-3">
        <MobileNav user={user} />
        <h1 className="text-base md:text-lg font-semibold tracking-tight">
          {currentTitle}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm font-medium">{user.name}</span>
            <Badge variant="outline" className="text-xs">
              {user.role.replace("_", " ")}
            </Badge>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="gap-1.5 bg-[var(--brand-white)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_8%,var(--brand-white))]"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  ShieldCheck,
  UserCheck,
  History,
  Palette,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function getNavItemsForUser(user) {
  if (!user) return [];

  const items = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Leads",
      href: "/leads",
      icon: Users,
    },
  ];

  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
    items.push({
      label: "Companies",
      href: "/companies",
      icon: Building2,
    });
  }

  if (user.role === "SUPER_ADMIN") {
    items.push({
      label: "Admins",
      href: "/admins",
      icon: ShieldCheck,
    });
  }

  if (
    user.role === "SUPER_ADMIN" ||
    (user.role === "ADMIN" && user.permissions?.canCreateUser)
  ) {
    items.push({
      label: "Client Users",
      href: "/users",
      icon: UserCheck,
    });
  }

  if (user.role === "SUPER_ADMIN") {
    items.push({
      label: "Activity Logs",
      href: "/activity-logs",
      icon: History,
    });
  }

  if (user.role === "SUPER_ADMIN") {
    items.push({
      label: "Theme Settings",
      href: "/theme-settings",
      icon: Palette,
    });
  }

  return items;
}

export function SidebarContent({ user, onNavigate }) {
  const pathname = usePathname();
  const navItems = getNavItemsForUser(user);

  return (
    <div className="flex h-full flex-col py-5 px-3">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2.5 px-3 mb-7">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-[var(--brand-white)] shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight leading-none">AgencyCRM</p>
            <p className="text-[11px] text-muted-foreground mt-1">Lead & Client Ops</p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-[var(--brand-primary)] text-[var(--brand-white)] shadow-xs"
                    : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--brand-primary)_12%,var(--brand-cream))] hover:text-[var(--brand-primary)]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {user && (
        <div className="mt-4 rounded-xl border border-border bg-[var(--brand-white)] p-3 mx-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold truncate">{user.name}</p>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {user.role.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-1">{user.email}</p>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ user }) {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-[var(--brand-cream)] z-30">
      <SidebarContent user={user} />
    </aside>
  );
}
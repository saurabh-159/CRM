"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateUserModal } from "@/components/admin/CreateUserModal";

export default function UsersPage() {
  const [user, setUser] = useState(null);
  const [clientUsers, setClientUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, usersRes, compRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/users"),
        fetch("/api/companies"),
      ]);
      const [meData, usersData, compData] = await Promise.all([
        meRes.json(),
        usersRes.json(),
        compRes.json(),
      ]);

      setUser(meData.user);
      setClientUsers(usersData.users || []);
      setCompanies(compData.companies || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function toggleUserActive(targetUser, isActive) {
    try {
      const res = await fetch(`/api/users/${targetUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update status");

      toast.success(`User ${isActive ? "activated" : "deactivated"}`);
      setClientUsers((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, isActive } : u))
      );
    } catch (err) {
      toast.error(err.message);
    }
  }

  const canCreate =
    user?.role === "SUPER_ADMIN" ||
    (user?.role === "ADMIN" && user?.permissions?.canCreateUser);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Client Users (Company Logins)</h2>
          <p className="text-sm text-muted-foreground">
            Manage login credentials for company owners and their sales teams.
          </p>
        </div>
        {canCreate && <CreateUserModal companies={companies} onCreated={loadData} />}
      </div>

      {loading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : clientUsers.length ? (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--brand-cream)]/60 hover:bg-[var(--brand-cream)]/60">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Assigned Company</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientUsers.map((u) => (
                <TableRow key={u._id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.companyId?.name || "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.createdBy?.name || "Super Admin"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={Boolean(u.isActive)}
                      onCheckedChange={(val) => toggleUserActive(u, val)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-sm font-medium">No client users created yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create credentials for a company owner so they can track and update their leads.
          </p>
        </Card>
      )}
    </div>
  );
}
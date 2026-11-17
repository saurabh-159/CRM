"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateAdminModal } from "@/components/admin/CreateAdminModal";
import { PermissionToggles } from "@/components/admin/PermissionToggles";

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admins");
      const data = await res.json();
      setAdmins(data.admins || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  function handleAdminUpdated(updatedAdmin) {
    setAdmins((prev) =>
      prev.map((a) => (a._id === updatedAdmin._id ? { ...a, ...updatedAdmin } : a))
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Admins & Access Control</h2>
          <p className="text-sm text-muted-foreground">
            Create Admin managers and toggle whether they can create companies or client users.
          </p>
        </div>
        <CreateAdminModal onCreated={fetchAdmins} />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : admins.length ? (
        <div className="space-y-4">
          {admins.map((admin) => (
            <Card key={admin._id}>
              <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-base">{admin.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {admin.email}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-muted-foreground mr-1">
                      Assigned Companies:
                    </span>
                    {admin.assignedCompanies?.length ? (
                      admin.assignedCompanies.map((c) => (
                        <Badge key={c._id} variant="secondary" className="text-xs">
                          {c.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">None assigned</span>
                    )}
                  </div>
                </div>

                <PermissionToggles admin={admin} onUpdated={handleAdminUpdated} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-sm font-medium">No Admins created yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create an Admin and assign client companies to delegate operations.
          </p>
        </Card>
      )}
    </div>
  );
}
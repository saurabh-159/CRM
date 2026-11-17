"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function PermissionToggles({ admin, onUpdated }) {
  const [loadingKey, setLoadingKey] = useState(null);

  async function togglePermission(field, value) {
    setLoadingKey(field);
    try {
      const res = await fetch(`/api/admins/${admin._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update permission");

      toast.success("Admin permission updated");
      onUpdated(data.admin);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex items-center gap-2">
        <Switch
          id={`comp-${admin._id}`}
          checked={Boolean(admin.permissions?.canCreateCompany)}
          disabled={loadingKey === "canCreateCompany"}
          onCheckedChange={(val) => togglePermission("canCreateCompany", val)}
        />
        <Label htmlFor={`comp-${admin._id}`} className="text-xs cursor-pointer">
          Can Create Companies
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id={`usr-${admin._id}`}
          checked={Boolean(admin.permissions?.canCreateUser)}
          disabled={loadingKey === "canCreateUser"}
          onCheckedChange={(val) => togglePermission("canCreateUser", val)}
        />
        <Label htmlFor={`usr-${admin._id}`} className="text-xs cursor-pointer">
          Can Create Client Users
        </Label>
      </div>
    </div>
  );
}
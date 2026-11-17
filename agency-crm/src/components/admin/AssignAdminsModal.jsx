"use client";

import { useState, useEffect } from "react";
import { UserCog } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function AssignAdminsModal({ company, allAdmins, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setSelected(company.assignedAdmins?.map((a) => a._id || a) || []);
    }
  }, [company, open]);

  function toggleAdmin(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${company._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedAdmins: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign admins");

      toast.success(`Updated admins for ${company.name}`);
      setOpen(false);
      onUpdated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <UserCog className="h-3.5 w-3.5" />
          <span>Assign Admins</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Admins to {company.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3 my-2">
          {allAdmins.length ? (
            allAdmins.map((admin) => (
              <label
                key={admin._id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
              >
                <div>
                  <p className="text-sm font-medium">{admin.name}</p>
                  <p className="text-xs text-muted-foreground">{admin.email}</p>
                </div>
                <input
                  type="checkbox"
                  checked={selected.includes(admin._id)}
                  onChange={() => toggleAdmin(admin._id)}
                  className="h-4 w-4"
                />
              </label>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No admins created yet.</p>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Assignments"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
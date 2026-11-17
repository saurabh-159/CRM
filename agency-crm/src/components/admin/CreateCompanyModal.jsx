"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateCompanyModal({ admins = [], isSuperAdmin = false, onCreated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [selectedAdmins, setSelectedAdmins] = useState([]);

  function toggleAdmin(id) {
    setSelectedAdmins((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          industry,
          assignedAdmins: selectedAdmins,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create company");

      toast.success(`Company "${data.company.name}" created with Webhook API Key`);
      setName("");
      setIndustry("");
      setSelectedAdmins([]);
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span>New Company</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Client Company</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input
              required
              placeholder="e.g. Himalayan Travel"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Industry / Niche</Label>
            <Input
              placeholder="e.g. Tours & Travel"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>

          {isSuperAdmin && admins.length > 0 && (
            <div className="space-y-2">
              <Label>Assign Admins (Multiple Allowed)</Label>
              <div className="max-h-40 overflow-y-auto rounded-lg border p-2.5 space-y-2">
                {admins.map((admin) => (
                  <label
                    key={admin._id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAdmins.includes(admin._id)}
                      onChange={() => toggleAdmin(admin._id)}
                      className="rounded border-gray-300"
                    />
                    <span>{admin.name}</span>
                    <span className="text-xs text-muted-foreground">({admin.email})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create Company"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
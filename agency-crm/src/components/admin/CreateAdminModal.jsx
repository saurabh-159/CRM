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
import { Switch } from "@/components/ui/switch";

export function CreateAdminModal({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    canCreateCompany: false,
    canCreateUser: false,
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create admin");

      toast.success(`Admin "${data.admin.name}" created`);
      setForm({
        name: "",
        email: "",
        password: "",
        canCreateCompany: false,
        canCreateUser: false,
      });
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
          <span>Create Admin</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Admin</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input
              required
              placeholder="e.g. Rahul Sharma"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Login Email</Label>
            <Input
              required
              type="email"
              placeholder="rahul@agency.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input
              required
              type="password"
              placeholder="Min 6 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground">
              Optional Creation Permissions (Default OFF)
            </p>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Allow Creating Companies</Label>
              <Switch
                checked={form.canCreateCompany}
                onCheckedChange={(v) => setForm({ ...form, canCreateCompany: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Allow Creating Client Users</Label>
              <Switch
                checked={form.canCreateUser}
                onCheckedChange={(v) => setForm({ ...form, canCreateUser: v })}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create Admin Account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
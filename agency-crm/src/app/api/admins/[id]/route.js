import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { User } from "@/models/User";
import { recordActivity } from "@/lib/logger";

export async function PATCH(req, { params }) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || sessionUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    await connectDB();
    const admin = await User.findOne({ _id: id, role: "ADMIN" });
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const oldPermissions = { ...admin.permissions };

    if (typeof body.canCreateCompany === "boolean") {
      admin.permissions.canCreateCompany = body.canCreateCompany;
    }
    if (typeof body.canCreateUser === "boolean") {
      admin.permissions.canCreateUser = body.canCreateUser;
    }
    if (typeof body.isActive === "boolean") {
      admin.isActive = body.isActive;
    }

    await admin.save();

    await recordActivity({
      actorId: sessionUser.id,
      actorName: sessionUser.name,
      actorRole: sessionUser.role,
      actionType: "ADMIN_PERMISSIONS_UPDATED",
      description: `Updated permissions/status for Admin "${admin.name}"`,
      metadata: {
        adminId: admin._id.toString(),
        before: oldPermissions,
        after: admin.permissions,
        isActive: admin.isActive,
      },
    });

    return NextResponse.json({
      admin: {
        _id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        permissions: admin.permissions,
        isActive: admin.isActive,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update admin" },
      { status: 500 }
    );
  }
}
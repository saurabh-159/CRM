import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleCompanyIds, getFreshUserContext } from "@/lib/permissions";
import { User } from "@/models/User";
import { recordActivity } from "@/lib/logger";

export async function PATCH(req, { params }) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const actor = await getFreshUserContext(sessionUser);
  if (!actor || actor.role === "USER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const targetUser = await User.findOne({ _id: id, role: "USER" });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const accessibleIds = await getAccessibleCompanyIds(actor);
    if (
      accessibleIds !== null &&
      !accessibleIds.some((cid) => cid.toString() === targetUser.companyId?.toString())
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (typeof body.isActive === "boolean") {
      targetUser.isActive = body.isActive;
    }

    if (body.newPassword && body.newPassword.trim().length >= 6) {
      targetUser.passwordHash = await bcrypt.hash(body.newPassword.trim(), 12);
    }

    await targetUser.save();

    await recordActivity({
      companyId: targetUser.companyId?.toString() || null,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actionType: "CLIENT_USER_UPDATED",
      description: `${actor.name} updated credentials/status for user "${targetUser.name}"`,
    });

    return NextResponse.json({
      user: {
        _id: targetUser._id.toString(),
        isActive: targetUser.isActive,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}
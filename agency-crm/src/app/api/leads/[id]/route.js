import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleCompanyIds, getFreshUserContext } from "@/lib/permissions";
import { Lead } from "@/models/Lead";
import { recordActivity } from "@/lib/logger";

export async function PATCH(req, { params }) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await getFreshUserContext(sessionUser);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { status, note } = await req.json();

    const lead = await Lead.findById(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const accessibleIds = await getAccessibleCompanyIds(user);
    if (
      accessibleIds !== null &&
      !accessibleIds.some((cid) => cid.toString() === lead.companyId.toString())
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const oldStatus = lead.status;
    let changed = false;

    if (status && status !== oldStatus) {
      lead.status = status;
      changed = true;

      await recordActivity({
        companyId: lead.companyId.toString(),
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        actionType: "LEAD_STATUS_UPDATED",
        description: `${user.name} (${user.role}) changed lead "${lead.name}" status from ${oldStatus} to ${status}`,
        metadata: {
          leadId: lead._id.toString(),
          before: oldStatus,
          after: status,
        },
      });
    }

    if (note && note.trim()) {
      lead.notes.push({
        text: note.trim(),
        addedBy: user.id,
        addedByName: user.name,
        addedByRole: user.role,
        createdAt: new Date(),
      });
      changed = true;

      await recordActivity({
        companyId: lead.companyId.toString(),
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        actionType: "LEAD_NOTE_ADDED",
        description: `${user.name} (${user.role}) added a note on lead "${lead.name}"`,
        metadata: {
          leadId: lead._id.toString(),
          note: note.trim(),
        },
      });
    }

    if (changed) {
      lead.lastUpdatedBy = user.id;
      await lead.save();
    }

    const updatedLead = await Lead.findById(id)
      .populate("companyId", "name")
      .populate("lastUpdatedBy", "name role")
      .lean();

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update lead" },
      { status: 500 }
    );
  }
}
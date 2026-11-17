import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Company } from "@/models/Company";
import { generateApiKey } from "@/lib/utils";
import { recordActivity } from "@/lib/logger";

export async function PATCH(req, { params }) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || sessionUser.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only Super Admin can assign admins or modify company settings" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();

    await connectDB();
    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (Array.isArray(body.assignedAdmins)) {
      const oldAdmins = company.assignedAdmins.map((a) => a.toString());
      company.assignedAdmins = body.assignedAdmins;

      await recordActivity({
        companyId: company._id.toString(),
        actorId: sessionUser.id,
        actorName: sessionUser.name,
        actorRole: sessionUser.role,
        actionType: "ADMINS_ASSIGNED",
        description: `Super Admin updated assigned admins for "${company.name}"`,
        metadata: { before: oldAdmins, after: body.assignedAdmins },
      });
    }

    if (body.regenerateKey === true) {
      company.webhookApiKey = generateApiKey("crm_live");

      await recordActivity({
        companyId: company._id.toString(),
        actorId: sessionUser.id,
        actorName: sessionUser.name,
        actorRole: sessionUser.role,
        actionType: "API_KEY_REGENERATED",
        description: `Super Admin regenerated webhook API key for "${company.name}"`,
      });
    }

    if (typeof body.isActive === "boolean") {
      company.isActive = body.isActive;
    }

    await company.save();

    const updated = await Company.findById(id)
      .populate("assignedAdmins", "name email")
      .lean();

    return NextResponse.json({ company: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update company" },
      { status: 500 }
    );
  }
}
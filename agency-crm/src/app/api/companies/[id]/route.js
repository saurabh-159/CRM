import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getFreshUserContext, getAccessibleCompanyIds } from "@/lib/permissions";
import { Company } from "@/models/Company";
import { Lead } from "@/models/Lead";
import { generateApiKey } from "@/lib/utils";
import { recordActivity } from "@/lib/logger";

export async function GET(_req, { params }) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
    }

    await connectDB();
    const user = await getFreshUserContext(sessionUser);
    if (!user || user.role === "USER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const accessibleIds = await getAccessibleCompanyIds(user);
    if (
      accessibleIds !== null &&
      !accessibleIds.some((companyId) => companyId.toString() === id)
    ) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const company = await Company.findById(id)
      .populate("assignedAdmins", "name email")
      .populate("createdBy", "name role")
      .lean();

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const leadCount = await Lead.countDocuments({ companyId: company._id });

    return NextResponse.json({
      company: {
        ...company,
        _id: company._id.toString(),
        leadCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load company" },
      { status: 500 }
    );
  }
}

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

    if (typeof body.name === "string") {
      const trimmedName = body.name.trim();
      if (!trimmedName) {
        return NextResponse.json({ error: "Company name is required" }, { status: 400 });
      }
      company.name = trimmedName;
    }

    if (typeof body.industry === "string") {
      company.industry = body.industry.trim();
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

    const leadCount = await Lead.countDocuments({ companyId: id });

    return NextResponse.json({
      company: {
        ...updated,
        _id: updated._id.toString(),
        leadCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update company" },
      { status: 500 }
    );
  }
}

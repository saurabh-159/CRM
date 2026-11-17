import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getFreshUserContext } from "@/lib/permissions";
import { Company } from "@/models/Company";
import { Lead } from "@/models/Lead";
import { generateApiKey } from "@/lib/utils";
import { recordActivity } from "@/lib/logger";

export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await getFreshUserContext(sessionUser);
  if (!user || user.role === "USER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filter =
    user.role === "SUPER_ADMIN"
      ? {}
      : { assignedAdmins: new mongoose.Types.ObjectId(user.id) };

  const companies = await Company.find(filter)
    .populate("assignedAdmins", "name email")
    .populate("createdBy", "name role")
    .sort({ createdAt: -1 })
    .lean();

  const leadCounts = await Lead.aggregate([
    { $group: { _id: "$companyId", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(
    leadCounts.map((item) => [item._id.toString(), item.count])
  );

  const formatted = companies.map((c) => ({
    ...c,
    _id: c._id.toString(),
    leadCount: countMap[c._id.toString()] || 0,
  }));

  return NextResponse.json({ companies: formatted });
}

export async function POST(req) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await getFreshUserContext(sessionUser);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAllowed =
    user.role === "SUPER_ADMIN" ||
    (user.role === "ADMIN" && user.permissions.canCreateCompany);

  if (!isAllowed) {
    return NextResponse.json(
      { error: "You do not have permission to create companies" },
      { status: 403 }
    );
  }

  try {
    const { name, industry, assignedAdmins = [] } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    // Agar Admin khud company banata hai, toh wo automatically assignedAdmins mein add ho jayega
    let finalAdmins = Array.isArray(assignedAdmins) ? [...assignedAdmins] : [];
    if (user.role === "ADMIN" && !finalAdmins.includes(user.id)) {
      finalAdmins.push(user.id);
    }

    const company = await Company.create({
      name: name.trim(),
      industry: industry?.trim() || "",
      assignedAdmins: finalAdmins,
      webhookApiKey: generateApiKey("crm_live"),
      createdBy: user.id,
    });

    await recordActivity({
      companyId: company._id.toString(),
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      actionType: "COMPANY_CREATED",
      description: `${user.name} (${user.role}) created company "${company.name}"`,
      metadata: {
        assignedAdminsCount: finalAdmins.length,
      },
    });

    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create company" },
      { status: 500 }
    );
  }
}
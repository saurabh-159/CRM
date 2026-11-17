import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleCompanyIds, getFreshUserContext } from "@/lib/permissions";
import { Lead } from "@/models/Lead";
import { Company } from "@/models/Company";
import { User } from "@/models/User";
import { ActivityLog } from "@/models/ActivityLog";

export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await getFreshUserContext(sessionUser);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessibleIds = await getAccessibleCompanyIds(user);
  const leadScope = accessibleIds === null ? {} : { companyId: { $in: accessibleIds } };

  const [
    totalLeads,
    newLeads,
    interestedLeads,
    convertedLeads,
    recentLeads,
    recentLogs,
    totalCompanies,
    totalAdmins,
    totalUsers,
  ] = await Promise.all([
    Lead.countDocuments(leadScope),
    Lead.countDocuments({ ...leadScope, status: "New" }),
    Lead.countDocuments({ ...leadScope, status: "Interested" }),
    Lead.countDocuments({ ...leadScope, status: "Converted" }),
    Lead.find(leadScope)
      .populate("companyId", "name")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    ActivityLog.find(leadScope)
      .populate("companyId", "name")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    accessibleIds === null
      ? Company.countDocuments()
      : Promise.resolve(accessibleIds.length),
    user.role === "SUPER_ADMIN" ? User.countDocuments({ role: "ADMIN" }) : Promise.resolve(0),
    accessibleIds === null
      ? User.countDocuments({ role: "USER" })
      : User.countDocuments({ role: "USER", companyId: { $in: accessibleIds } }),
  ]);

  return NextResponse.json({
    user,
    stats: {
      totalLeads,
      newLeads,
      interestedLeads,
      convertedLeads,
      totalCompanies,
      totalAdmins,
      totalUsers,
    },
    recentLeads,
    recentLogs,
  });
}
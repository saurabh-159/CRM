import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleCompanyIds, getFreshUserContext } from "@/lib/permissions";
import { ActivityLog } from "@/models/ActivityLog";

export async function GET(req) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await getFreshUserContext(sessionUser);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const actionType = searchParams.get("actionType");

  const accessibleIds = await getAccessibleCompanyIds(user);
  const query = {};

  if (accessibleIds !== null) {
    if (companyId && companyId !== "ALL") {
      const allowed = accessibleIds.some((id) => id.toString() === companyId);
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      query.companyId = new mongoose.Types.ObjectId(companyId);
    } else {
      query.companyId = { $in: accessibleIds };
    }
  } else if (companyId && companyId !== "ALL") {
    query.companyId = new mongoose.Types.ObjectId(companyId);
  }

  if (actionType && actionType !== "ALL") {
    query.actionType = actionType;
  }

  const logs = await ActivityLog.find(query)
    .populate("companyId", "name")
    .sort({ createdAt: -1 })
    .limit(150)
    .lean();

  return NextResponse.json({ logs });
}
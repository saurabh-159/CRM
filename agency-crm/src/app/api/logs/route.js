import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getFreshUserContext } from "@/lib/permissions";
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

  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const actionType = searchParams.get("actionType");
  const actorRole = searchParams.get("actorRole");

  const query = {};

  if (companyId && companyId !== "ALL") {
    query.companyId = new mongoose.Types.ObjectId(companyId);
  }

  if (actionType && actionType !== "ALL") {
    query.actionType = actionType;
  }

  if (actorRole && actorRole !== "ALL") {
    query.actorRole = actorRole;
  }

  const logs = await ActivityLog.find(query)
    .populate("companyId", "name")
    .sort({ createdAt: -1 })
    .limit(150)
    .lean();

  return NextResponse.json({ logs });
}

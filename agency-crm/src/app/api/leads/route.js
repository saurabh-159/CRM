import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleCompanyIds, getFreshUserContext } from "@/lib/permissions";
import { Lead } from "@/models/Lead";

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
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const search = searchParams.get("search");
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

  const accessibleIds = await getAccessibleCompanyIds(user);
  const query = {};

  if (accessibleIds !== null) {
    if (companyId && companyId !== "ALL") {
      const isAllowed = accessibleIds.some((id) => id.toString() === companyId);
      if (!isAllowed) {
        return NextResponse.json({ error: "Forbidden company filter" }, { status: 403 });
      }
      query.companyId = new mongoose.Types.ObjectId(companyId);
    } else {
      query.companyId = { $in: accessibleIds };
    }
  } else if (companyId && companyId !== "ALL") {
    query.companyId = new mongoose.Types.ObjectId(companyId);
  }

  if (status && status !== "ALL") {
    query.status = status;
  }

  if (source && source !== "ALL") {
    query.source = source;
  }

  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), "i");
    query.$or = [
      { name: regex },
      { phone: regex },
      { email: regex },
      { campaignName: regex },
    ];
  }

  const leads = await Lead.find(query)
    .populate("companyId", "name")
    .populate("lastUpdatedBy", "name role")
    .sort({ createdAt: -1 })
    .limit(250)
    .lean();

  return NextResponse.json({ leads });
}
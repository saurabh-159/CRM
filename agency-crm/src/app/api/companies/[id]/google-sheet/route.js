import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleCompanyIds, getFreshUserContext } from "@/lib/permissions";
import { Company } from "@/models/Company";
import { recordActivity } from "@/lib/logger";
import {
  extractSpreadsheetId,
  verifySheetAccess,
  backfillCompanyLeadsToSheet,
} from "@/lib/googleSheets";

// GET: Fetch current Google Sheet status & bot email for UI
export async function GET(_req, { params }) {
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const accessibleIds = await getAccessibleCompanyIds(user);
    if (
      accessibleIds !== null &&
      !accessibleIds.some((cid) => cid.toString() === id.toString())
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const company = await Company.findById(id)
      .select("name googleSheetId sheetSyncEnabled lastSyncedAt")
      .lean();

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({
      company,
      botEmail: process.env.GOOGLE_CLIENT_EMAIL || "",
      masterSheetId:
        user.role === "SUPER_ADMIN" ? process.env.MASTER_GOOGLE_SHEET_ID || "" : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load sheet settings" },
      { status: 500 }
    );
  }
}

// POST: Link Google Sheet & Backfill All Past Leads of This Company
export async function POST(req, { params }) {
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const accessibleIds = await getAccessibleCompanyIds(user);
    if (
      accessibleIds !== null &&
      !accessibleIds.some((cid) => cid.toString() === id.toString())
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = await req.json();
    const spreadsheetId = extractSpreadsheetId(body.sheetUrl || body.googleSheetId);

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Please enter a valid Google Sheet URL or ID" },
        { status: 400 }
      );
    }

    let sheetTitle = "";
    try {
      sheetTitle = await verifySheetAccess(spreadsheetId);
    } catch {
      return NextResponse.json(
        {
          error: `Bot cannot access this sheet. Please share your Google Sheet with ${process.env.GOOGLE_CLIENT_EMAIL} as Editor first.`,
        },
        { status: 400 }
      );
    }

    company.googleSheetId = spreadsheetId;
    company.sheetSyncEnabled = true;
    await company.save();

    const { syncedCount, lastSyncedAt } = await backfillCompanyLeadsToSheet(company);

    await recordActivity({
      companyId: company._id.toString(),
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      actionType: "GOOGLE_SHEET_LINKED",
      description: `${user.name} (${user.role}) linked Google Sheet "${sheetTitle}" for ${company.name} and synced ${syncedCount} historical leads`,
      metadata: { spreadsheetId, syncedCount },
    });

    return NextResponse.json({
      message: `Connected to "${sheetTitle}" and synced ${syncedCount} historical leads.`,
      googleSheetId: spreadsheetId,
      sheetTitle,
      syncedCount,
      lastSyncedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to link Google Sheet" },
      { status: 500 }
    );
  }
}

// PATCH: Force Re-Sync or Toggle Sync
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const accessibleIds = await getAccessibleCompanyIds(user);
    if (
      accessibleIds !== null &&
      !accessibleIds.some((cid) => cid.toString() === id.toString())
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = await req.json();

    if (typeof body.sheetSyncEnabled === "boolean") {
      company.sheetSyncEnabled = body.sheetSyncEnabled;
      await company.save();
    }

    if (body.forceResync) {
      if (!company.googleSheetId) {
        return NextResponse.json(
          { error: "Link a Google Sheet before re-syncing." },
          { status: 400 }
        );
      }

      const { syncedCount, lastSyncedAt } = await backfillCompanyLeadsToSheet(company);
      return NextResponse.json({
        message: `Re-synced ${syncedCount} leads successfully.`,
        syncedCount,
        lastSyncedAt,
      });
    }

    return NextResponse.json({
      message: "Sheet settings updated",
      sheetSyncEnabled: company.sheetSyncEnabled,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update sheet settings" },
      { status: 500 }
    );
  }
}
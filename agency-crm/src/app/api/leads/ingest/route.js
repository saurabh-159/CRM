import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Company } from "@/models/Company";
import { Lead } from "@/models/Lead";
import { recordActivity } from "@/lib/logger";
import { syncLeadEverywhere } from "@/lib/googleSheets";

const ALLOWED_STATUSES = [
  "New",
  "Contacted",
  "Follow-Up",
  "Interested",
  "Converted",
  "Junk",
];

function normalizeStatus(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = ALLOWED_STATUSES.find(
    (status) => status.toLowerCase() === value.trim().toLowerCase()
  );
  return match || null;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token) {
    await connectDB();
    const company = await Company.findOne({ webhookApiKey: token, isActive: true });
    if (company) {
      return new NextResponse(challenge, { status: 200 });
    }
    return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
  }

  return NextResponse.json({ status: "Lead Ingest Webhook Active" });
}

export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url);
    const apiKey =
      req.headers.get("x-api-key") ||
      searchParams.get("api_key") ||
      searchParams.get("key");

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing x-api-key header or api_key query parameter" },
        { status: 401 }
      );
    }

    await connectDB();
    const company = await Company.findOne({ webhookApiKey: apiKey, isActive: true });
    if (!company) {
      return NextResponse.json(
        { error: "Invalid or inactive company API key" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const name =
      body.full_name ||
      body.name ||
      body.first_name ||
      body.lead_name ||
      "Unknown Lead";

    const phone = String(
      body.phone_number || body.phone || body.mobile || body.whatsapp || ""
    ).trim();

    const email = String(body.email || body.work_email || "")
      .trim()
      .toLowerCase();

    const source = body.source || body.platform || "Meta Ads";
    const campaignName = String(
      body.campaign_name || body.campaignName || body.utm_campaign || ""
    ).trim();
    const formName = body.form_name || body.form || "";

    const resolvedStatus = normalizeStatus(body.status);
    const status = resolvedStatus || "New";

    // Upsert key = phone only. Match → update sent fields. No match → create new lead.
    let existingLead = null;
    if (phone) {
      existingLead = await Lead.findOne({
        companyId: company._id,
        phone,
      });
    }

    if (existingLead) {
      if (name) existingLead.name = String(name).trim();
      if (email) existingLead.email = email;
      if (source) existingLead.source = String(source).trim();
      if (campaignName) existingLead.campaignName = campaignName;
      if (formName) existingLead.formName = String(formName).trim();
      if (resolvedStatus) existingLead.status = resolvedStatus;

      // Merge every key from the payload (budget, travel_month, etc.) into rawPayload
      existingLead.rawPayload = {
        ...(existingLead.rawPayload && typeof existingLead.rawPayload === "object"
          ? existingLead.rawPayload
          : {}),
        ...body,
      };
      existingLead.markModified("rawPayload");

      existingLead.notes.push({
        text: "Lead re-submitted / updated via webhook",
        addedBy: company.createdBy,
        addedByName: "Webhook Sync",
        addedByRole: "SYSTEM",
        createdAt: new Date(),
      });

      await existingLead.save();
      await syncLeadEverywhere(company, existingLead);

      await recordActivity({
        companyId: company._id.toString(),
        actorName: "Webhook Sync",
        actorRole: "SYSTEM",
        actionType: "LEAD_UPDATED",
        description: `Lead "${existingLead.name}" re-submitted / updated via webhook for ${company.name}`,
        metadata: { leadId: existingLead._id.toString() },
      });

      return NextResponse.json({
        success: true,
        updated: true,
        leadId: existingLead._id,
      });
    }

    const newLead = await Lead.create({
      companyId: company._id,
      name: String(name).trim(),
      phone,
      email,
      source: String(source).trim(),
      campaignName,
      formName: String(formName).trim(),
      status,
      rawPayload: body,
    });

    await syncLeadEverywhere(company, newLead);

    await recordActivity({
      companyId: company._id.toString(),
      actorName: `Webhook (${source})`,
      actorRole: "SYSTEM",
      actionType: "LEAD_INGESTED",
      description: `New lead "${newLead.name}" received for ${company.name} via ${source}`,
      metadata: { leadId: newLead._id.toString() },
    });

    return NextResponse.json(
      {
        success: true,
        created: true,
        leadId: newLead._id,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to ingest lead" },
      { status: 500 }
    );
  }
}
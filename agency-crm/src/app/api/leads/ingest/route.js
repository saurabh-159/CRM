import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Company } from "@/models/Company";
import { Lead } from "@/models/Lead";
import { recordActivity } from "@/lib/logger";

// Meta Webhook Verification (GET request)
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

// Universal Lead Receiver (Meta Ads, Zapier/Make, Website Forms)
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

    const payload = await req.json();

    // Flexible field extraction (supports Meta Ads, custom HTML forms, Zapier/Make)
    const name =
      payload.full_name ||
      payload.name ||
      payload.first_name ||
      payload.lead_name ||
      "Unknown Lead";

    const phone =
      payload.phone_number ||
      payload.phone ||
      payload.mobile ||
      payload.whatsapp ||
      "";

    const email = payload.email || payload.work_email || "";

    const source = payload.source || payload.platform || "Meta Ads";
    const campaignName = payload.campaign_name || payload.campaign || "";
    const formName = payload.form_name || payload.form || "";

    const newLead = await Lead.create({
      companyId: company._id,
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: String(email).trim().toLowerCase(),
      source: String(source).trim(),
      campaignName: String(campaignName).trim(),
      formName: String(formName).trim(),
      status: "New",
      rawPayload: payload,
    });

    await recordActivity({
      companyId: company._id.toString(),
      actorName: `Webhook (${source})`,
      actorRole: "SYSTEM",
      actionType: "LEAD_RECEIVED",
      description: `New lead "${newLead.name}" received for ${company.name} via ${source}`,
      metadata: { leadId: newLead._id.toString() },
    });

    return NextResponse.json(
      {
        success: true,
        leadId: newLead._id.toString(),
        company: company.name,
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
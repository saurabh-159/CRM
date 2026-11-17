import { google } from "googleapis";
import { Lead } from "@/models/Lead";
import { Company } from "@/models/Company";

const HEADERS = [
  "Lead ID",
  "Name",
  "Phone",
  "Email",
  "Source",
  "Campaign Name",
  "Form Name",
  "Status",
  "Notes",
  "Created At",
  "Raw Payload",
];

function readPrivateKey() {
  const raw = process.env.GOOGLE_PRIVATE_KEY;
  if (!raw) return "";

  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  return key.replace(/\\n/g, "\n");
}

function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = readPrivateKey();

  if (!clientEmail || !privateKey) {
    throw new Error("Google Sheets credentials missing in environment variables");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

export function sanitizeTabName(name) {
  const cleaned = (name || "Company Leads")
    .replace(/[\\/?*[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 95) || "Company Leads";
}

function a1(tabName, range) {
  const escaped = String(tabName).replace(/'/g, "''");
  return `'${escaped}'!${range}`;
}

export function extractSpreadsheetId(urlOrId) {
  if (!urlOrId) return "";
  const trimmed = String(urlOrId).trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : trimmed;
}

function stringifyPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  if (Object.keys(payload).length === 0) return "";
  try {
    return JSON.stringify(payload);
  } catch {
    return "";
  }
}

function formatLeadRow(lead) {
  const notesText = Array.isArray(lead.notes)
    ? lead.notes
        .map((n) => {
          const text = n?.text ? String(n.text).trim() : "";
          if (!text) return "";
          return n.addedByName ? `[${n.addedByName}]: ${text}` : text;
        })
        .filter(Boolean)
        .join(" | ")
    : "";

  return [
    lead._id ? lead._id.toString() : "",
    lead.name || "Unknown Lead",
    lead.phone || "",
    lead.email || "",
    lead.source || "Meta Ads",
    lead.campaignName || "",
    lead.formName || "",
    lead.status || "New",
    notesText,
    lead.createdAt
      ? new Date(lead.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : "",
    stringifyPayload(lead.rawPayload),
  ];
}

async function boldHeaderRow(sheets, spreadsheetId, sheetId) {
  if (sheetId === undefined || sheetId === null) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat.bold",
          },
        },
      ],
    },
  });
}

async function ensureHeaderRow(sheets, spreadsheetId, tabName, sheetId) {
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: a1(tabName, "A1:K1"),
  });
  const headerRow = headerRes.data.values?.[0] || [];
  if (headerRow.length > 0) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: a1(tabName, "A1:K1"),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [HEADERS] },
  });
  await boldHeaderRow(sheets, spreadsheetId, sheetId);
}

async function ensureCompanyTab(sheets, spreadsheetId, companyName) {
  const tabName = sanitizeTabName(companyName);
  const meta = await sheets.spreadsheets.get({ spreadsheetId });

  const existingSheet = meta.data.sheets?.find(
    (s) => s.properties?.title === tabName
  );

  if (existingSheet) {
    await ensureHeaderRow(
      sheets,
      spreadsheetId,
      tabName,
      existingSheet.properties?.sheetId
    );
    return tabName;
  }

  const addRes = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: tabName,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        },
      ],
    },
  });

  const sheetId = addRes.data.replies?.[0]?.addSheet?.properties?.sheetId;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: a1(tabName, "A1:K1"),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [HEADERS] },
  });
  await boldHeaderRow(sheets, spreadsheetId, sheetId);

  return tabName;
}

async function findExistingRow(sheets, spreadsheetId, tabName, lead) {
  const existingCol = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: a1(tabName, "A:C"),
  });
  const rows = existingCol.data.values || [];
  const leadIdStr = lead._id.toString();
  let phoneRow = null;

  for (let i = 1; i < rows.length; i++) {
    const rowLeadId = rows[i]?.[0];
    const rowPhone = rows[i]?.[2];
    if (rowLeadId === leadIdStr) return i + 1;
    if (
      phoneRow === null &&
      lead.phone &&
      rowPhone === lead.phone &&
      !rowLeadId
    ) {
      phoneRow = i + 1;
    }
  }

  return phoneRow;
}

async function upsertLeadInSheet(sheets, spreadsheetId, company, lead, rowField) {
  if (!lead?._id) return;

  const tabName = await ensureCompanyTab(sheets, spreadsheetId, company.name);
  const rowValues = formatLeadRow(lead);
  let targetRow = Number(lead[rowField]) || null;

  if (targetRow && targetRow > 1) {
    const check = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: a1(tabName, `A${targetRow}`),
    });
    const existingId = check.data.values?.[0]?.[0];
    if (existingId && existingId !== lead._id.toString()) {
      targetRow = null;
    }
  } else {
    targetRow = null;
  }

  if (!targetRow) {
    targetRow = await findExistingRow(sheets, spreadsheetId, tabName, lead);
  }

  if (targetRow && targetRow > 1) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: a1(tabName, `A${targetRow}:K${targetRow}`),
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rowValues] },
    });
  } else {
    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: a1(tabName, "A:K"),
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [rowValues] },
    });

    const updatedRange = appendRes.data.updates?.updatedRange || "";
    const rowMatch = updatedRange.match(/![A-Z]+(\d+)/);
    targetRow = rowMatch ? parseInt(rowMatch[1], 10) : null;
  }

  if (targetRow && lead[rowField] !== targetRow) {
    await Lead.findByIdAndUpdate(lead._id, { [rowField]: targetRow });
    lead[rowField] = targetRow;
  }
}

async function replaceCompanyRows(sheets, spreadsheetId, company, leads, rowField) {
  const tabName = await ensureCompanyTab(sheets, spreadsheetId, company.name);

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: a1(tabName, "A2:K"),
  });

  if (!leads.length) return;

  const rows = leads.map(formatLeadRow);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: a1(tabName, `A2:K${rows.length + 1}`),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });

  await Lead.bulkWrite(
    leads.map((lead, idx) => ({
      updateOne: {
        filter: { _id: lead._id },
        update: { $set: { [rowField]: idx + 2 } },
      },
    }))
  );

  leads.forEach((lead, idx) => {
    lead[rowField] = idx + 2;
  });
}

async function stampCompanySync(company) {
  const lastSyncedAt = new Date();
  await Company.findByIdAndUpdate(company._id, { lastSyncedAt });
  company.lastSyncedAt = lastSyncedAt;
  return lastSyncedAt;
}

export async function syncLeadEverywhere(company, lead) {
  try {
    if (!company?._id || !lead?._id || company.sheetSyncEnabled === false) return;

    const sheets = getSheetsClient();
    let synced = false;

    if (process.env.MASTER_GOOGLE_SHEET_ID) {
      try {
        await upsertLeadInSheet(
          sheets,
          process.env.MASTER_GOOGLE_SHEET_ID,
          company,
          lead,
          "masterSheetRowNumber"
        );
        synced = true;
      } catch (err) {
        console.error("Master sheet sync error:", err.message);
      }
    }

    if (company.googleSheetId) {
      try {
        await upsertLeadInSheet(
          sheets,
          company.googleSheetId,
          company,
          lead,
          "clientSheetRowNumber"
        );
        synced = true;
      } catch (err) {
        console.error("Client sheet sync error:", err.message);
      }
    }

    if (synced) {
      await stampCompanySync(company);
    }
  } catch (err) {
    console.error("Google Sheets sync error:", err.message);
  }
}

export async function verifySheetAccess(spreadsheetId) {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  return meta.data.properties?.title || "Connected Sheet";
}

export async function backfillCompanyLeadsToSheet(company) {
  if (!company?.googleSheetId) {
    return { syncedCount: 0, lastSyncedAt: company?.lastSyncedAt || null };
  }

  const sheets = getSheetsClient();
  const leads = await Lead.find({ companyId: company._id }).sort({ createdAt: 1 });

  await replaceCompanyRows(
    sheets,
    company.googleSheetId,
    company,
    leads,
    "clientSheetRowNumber"
  );

  if (process.env.MASTER_GOOGLE_SHEET_ID) {
    try {
      await replaceCompanyRows(
        sheets,
        process.env.MASTER_GOOGLE_SHEET_ID,
        company,
        leads,
        "masterSheetRowNumber"
      );
    } catch (err) {
      console.error("Master sheet backfill error:", err.message);
    }
  }

  const lastSyncedAt = await stampCompanySync(company);
  return { syncedCount: leads.length, lastSyncedAt };
}

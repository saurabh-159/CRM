# Google Sheets Multi-Tenant Live Sync — Setup & Operations Guide

Yeh guide batati hai ki **AgencyCRM** mein multi-tenant Google Sheets sync kaise kaam karta hai, Google Cloud IAM Service Account (Bot) kaise banaya gaya hai, aur naye clients ki personal Google Sheets ko CRM se kaise link kiya jata hai.

---

## 1. Architecture Overview (Yeh Kaise Kaam Karta Hai?)

Hamara CRM **Dual-Sync Architecture** par kaam karta hai:

1. **Agency Master Sheet (Super Admin Centralized Sheet):**
   - Ek single master spreadsheet jismein **sabhi active companies** ki leads automatically sync hoti hain.
   - Har company ke naam ka ek **dedicated tab** (e.g., `himalyan travel`) automatically banta hai.
   - Nayi lead aane par nayi row append hoti hai, aur CRM mein status/note update hone par wahi existing row real-time update hoti hai.
2. **Client Personal Sheet (Optional Per-Company Sheet):**
   - Agar kisi client ko apni leads apne khud ke Gmail account ki Google Sheet mein bhi chahiye, toh wo (ya Admin) apni sheet ka link CRM mein connect kar sakta hai.
   - Link karte hi us company ki **saari purani leads** backfill ho jati hain aur aage aane wali leads Master Sheet + Client Sheet dono mein ek saath sync hoti hain.

---

## 2. Google Cloud IAM Service Account (Bot) Setup

Google ki security policy ke karan koi bhi backend server bina authorization ke private Google Sheets mein data nahi likh sakta. Iske liye humne ek **Google Cloud Service Account (Robot User)** banaya hai:

- **Bot Service Account Email:** `crm-sheet-bot@agencycrm-sheets.iam.gserviceaccount.com`
- **Google Cloud Project ID:** `agencycrm-sheets`

### Naya Service Account Banane ke Steps (Reference ke liye):
1. [Google Cloud Console](https://console.cloud.google.com/) open karein aur project select/create karein.
2. **APIs & Services -> Library** mein jakar **Google Sheets API** search karein aur **Enable** karein.
3. **IAM & Admin -> Service Accounts** par jayein aur **+ Create Service Account** par click karein:
   - **Name:** `crm-sheet-bot`
   - **Role:** Skip (kyunki access hum directly Google Sheets ke Share button se dete hain).
4. Banaye gaye Service Account par click karein -> **Keys** tab par jayein -> **Add Key -> Create new key -> JSON** select karein.
5. Download hui JSON file se `client_email` aur `private_key` copy karke `.env` aur Vercel Environment Variables mein save karein.

---

## 3. Environment Variables Configuration

Local `.env` aur **Vercel -> Project Settings -> Environment Variables** mein yeh variables set hone chahiye:

```env
GOOGLE_PROJECT_ID=agencycrm-sheets
GOOGLE_CLIENT_EMAIL=crm-sheet-bot@agencycrm-sheets.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
MASTER_GOOGLE_SHEET_ID=1K2-AXgw4LmuhlaSzLK35XbdBzLJ7AAOuRC_L9cdJvYU
```

> **Important Note (Vercel):** `GOOGLE_PRIVATE_KEY` ko Vercel mein **Secret** type ke roop mein save karein aur ensure karein ki `\n` newlines intact rahein.

---

## 4. Agency Master Sheet Setup (Super Admin)

1. Google Sheets mein ek blank spreadsheet banayein (e.g., `AgencyCRM Master Leads`).
2. Sheet ke URL se Spreadsheet ID copy karein:
   `https://docs.google.com/spreadsheets/d/<MASTER_GOOGLE_SHEET_ID>/edit`
3. Top-right **Share** button par click karein aur bot email add karein:
   - **Email:** `crm-sheet-bot@agencycrm-sheets.iam.gserviceaccount.com`
   - **Role:** `Editor`
4. **Send / Share** par click karein. Ab har company ki leads apne aap is sheet mein naye tabs banakar sync hongi.

---

## 5. Client Ki Personal Google Sheet Kaise Link Karein?

Jab koi client chahe ki uski leads uske khud ke Google Sheet mein bhi dikhein:

1. **Client Apni Sheet Banaye:** Client apne Gmail account se ek Google Sheet banayega.
2. **Bot Ko Editor Banaye:** Client apni sheet ke **Share** button par click karke `crm-sheet-bot@agencycrm-sheets.iam.gserviceaccount.com` ko **Editor** access dega.
3. **CRM Mein URL Paste Kare:**
   - Client apne Dashboard par (ya Admin **Companies** page par) **Google Sheets Live Sync** card mein us sheet ka full URL paste karega.
   - **Link & Sync Past Leads** button par click karega.
4. **Result:**
   - System bot access verify karega, status ko **Connected** karega, aur us company ki saari purani leads ko ek batch mein sheet ke andar sync kar dega.
   - Future mein har nayi lead ya status update dono sheets (Master + Client) mein real-time reflect hoga.

---

## 6. Key Project Files Reference

| File Path | Purpose |
| :--- | :--- |
| `src/lib/googleSheets.js` | Core Google Sheets API client, tab creation, row upsert, aur historical backfill logic. |
| `src/models/Company.js` | `googleSheetId`, `sheetSyncEnabled`, aur `lastSyncedAt` fields. |
| `src/models/Lead.js` | `masterSheetRowNumber` aur `clientSheetRowNumber` row-tracking fields. |
| `src/app/api/leads/ingest/route.js` | Webhook lead ingestion aur deduplication par real-time sheet sync trigger. |
| `src/app/api/leads/[id]/route.js` | Lead status aur notes update hone par existing sheet row update trigger. |
| `src/app/api/companies/[id]/google-sheet/route.js` | Client/Admin ke liye sheet link, bot access verification, aur force re-sync API. |
| `src/components/GoogleSheetSyncCard.jsx` | Frontend UI card (Bot email copy, sheet URL linking, aur manual re-sync). |
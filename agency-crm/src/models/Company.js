import mongoose from "mongoose";

const CompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    industry: { type: String, trim: true, default: "" },
    assignedAdmins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
    webhookApiKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Google Sheets Multi-Tenant Sync Fields
    googleSheetId: { type: String, default: "", trim: true },
    sheetSyncEnabled: { type: Boolean, default: true },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Company =
  mongoose.models.Company || mongoose.model("Company", CompanySchema);
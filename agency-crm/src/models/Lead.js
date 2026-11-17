import mongoose from "mongoose";

const LeadNoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    addedByName: { type: String, required: true },
    addedByRole: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const LeadSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, default: "Unknown Lead", trim: true },
    phone: { type: String, default: "", trim: true, index: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    source: { type: String, default: "Meta Ads", trim: true, index: true },
    campaignName: { type: String, default: "", trim: true },
    formName: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["New", "Contacted", "Follow-Up", "Interested", "Converted", "Junk"],
      default: "New",
      index: true,
    },
    rawPayload: { type: mongoose.Schema.Types.Mixed, default: {} },
    notes: { type: [LeadNoteSchema], default: [] },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

LeadSchema.index({ companyId: 1, createdAt: -1 });

export const Lead = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
import mongoose from "mongoose";

const ThemeSettingSchema = new mongoose.Schema(
  {
    primaryColor: { type: String, default: "#4D694E" },
    creamColor: { type: String, default: "#FFF3D5" },
    whiteColor: { type: String, default: "#FFFFFF" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const ThemeSetting =
  mongoose.models.ThemeSetting || mongoose.model("ThemeSetting", ThemeSettingSchema);

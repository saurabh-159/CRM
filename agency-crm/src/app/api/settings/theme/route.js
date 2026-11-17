import { connection, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordActivity } from "@/lib/logger";
import { ThemeSetting } from "@/models/ThemeSetting";
import { THEME_DEFAULTS, normalizeThemeColors } from "@/lib/theme";

function themePayload(theme) {
  return {
    primaryColor: theme?.primaryColor || THEME_DEFAULTS.primaryColor,
    creamColor: theme?.creamColor || THEME_DEFAULTS.creamColor,
    whiteColor: theme?.whiteColor || THEME_DEFAULTS.whiteColor,
  };
}

export async function GET() {
  try {
    await connection();
    await connectDB();
    const theme = await ThemeSetting.findOne().lean();
    return NextResponse.json(themePayload(theme), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to load theme settings:", error);
    return NextResponse.json(THEME_DEFAULTS, {
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export async function PATCH(req) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sessionUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const colors = normalizeThemeColors(body);
  if (!colors) {
    return NextResponse.json(
      { error: "Each color must be a 6-digit hex code" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const theme = await ThemeSetting.findOneAndUpdate(
      {},
      {
        primaryColor: colors.primaryColor,
        creamColor: colors.creamColor,
        whiteColor: colors.whiteColor,
        updatedBy: sessionUser.id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    await recordActivity({
      actorId: sessionUser.id,
      actorName: sessionUser.name,
      actorRole: sessionUser.role,
      actionType: "THEME_UPDATED",
      description: `Super Admin updated the global theme (primary ${colors.primaryColor}, cream ${colors.creamColor}, canvas ${colors.whiteColor})`,
      metadata: colors,
    });

    return NextResponse.json(themePayload(theme));
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to save theme" },
      { status: 500 }
    );
  }
}

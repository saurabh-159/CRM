import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getFreshUserContext } from "@/lib/permissions";

export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const freshUser = await getFreshUserContext(sessionUser);
  if (!freshUser) {
    return NextResponse.json({ error: "Account inactive or not found" }, { status: 401 });
  }

  return NextResponse.json({ user: freshUser });
}
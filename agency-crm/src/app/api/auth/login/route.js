import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { COOKIE_NAME, signSessionToken } from "@/lib/auth";
import { recordActivity } from "@/lib/logger";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const sessionPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId ? user.companyId.toString() : null,
      permissions: {
        canCreateCompany: Boolean(user.permissions?.canCreateCompany),
        canCreateUser: Boolean(user.permissions?.canCreateUser),
      },
    };

    const token = await signSessionToken(sessionPayload);

    await recordActivity({
      companyId: sessionPayload.companyId,
      actorId: sessionPayload.id,
      actorName: sessionPayload.name,
      actorRole: sessionPayload.role,
      actionType: "USER_LOGIN",
      description: `${sessionPayload.name} (${sessionPayload.role}) logged into the CRM`,
    });

    const response = NextResponse.json({ user: sessionPayload });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Login failed" },
      { status: 500 }
    );
  }
}
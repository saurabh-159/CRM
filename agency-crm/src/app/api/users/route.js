import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleCompanyIds, getFreshUserContext } from "@/lib/permissions";
import { User } from "@/models/User";
import { Company } from "@/models/Company";
import { recordActivity } from "@/lib/logger";

export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await getFreshUserContext(sessionUser);
  if (!user || user.role === "USER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const accessibleIds = await getAccessibleCompanyIds(user);
  const filter =
    accessibleIds === null
      ? { role: "USER" }
      : { role: "USER", companyId: { $in: accessibleIds } };

  const users = await User.find(filter)
    .select("-passwordHash")
    .populate("companyId", "name")
    .populate("createdBy", "name role")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ users });
}

export async function POST(req) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await getFreshUserContext(sessionUser);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAllowed =
    user.role === "SUPER_ADMIN" ||
    (user.role === "ADMIN" && user.permissions.canCreateUser);

  if (!isAllowed) {
    return NextResponse.json(
      { error: "You do not have permission to create company users" },
      { status: 403 }
    );
  }

  try {
    const { name, email, password, companyId } = await req.json();

    if (!name || !email || !password || !companyId) {
      return NextResponse.json(
        { error: "Name, email, password, and company are required" },
        { status: 400 }
      );
    }

    const accessibleIds = await getAccessibleCompanyIds(user);
    if (
      accessibleIds !== null &&
      !accessibleIds.some((id) => id.toString() === companyId)
    ) {
      return NextResponse.json(
        { error: "You are not assigned to this company" },
        { status: 403 }
      );
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const createdUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "USER",
      companyId: company._id,
      createdBy: user.id,
    });

    await recordActivity({
      companyId: company._id.toString(),
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      actionType: "CLIENT_USER_CREATED",
      description: `${user.name} (${user.role}) created user "${createdUser.name}" for ${company.name}`,
      metadata: {
        createdUserId: createdUser._id.toString(),
        email: createdUser.email,
      },
    });

    return NextResponse.json(
      {
        user: {
          _id: createdUser._id.toString(),
          name: createdUser.name,
          email: createdUser.email,
          companyId: { _id: company._id.toString(), name: company.name },
          isActive: createdUser.isActive,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { User } from "@/models/User";
import { Company } from "@/models/Company";
import { recordActivity } from "@/lib/logger";

export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || sessionUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const admins = await User.find({ role: "ADMIN" })
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .lean();

  const companies = await Company.find().select("_id name assignedAdmins").lean();

  const enrichedAdmins = admins.map((admin) => {
    const adminIdStr = admin._id.toString();
    const assigned = companies.filter((c) =>
      c.assignedAdmins?.some((id) => id.toString() === adminIdStr)
    );
    return {
      ...admin,
      _id: adminIdStr,
      assignedCompanies: assigned.map((c) => ({
        _id: c._id.toString(),
        name: c.name,
      })),
    };
  });

  return NextResponse.json({ admins: enrichedAdmins });
}

export async function POST(req) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser || sessionUser.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only Super Admin can create Admins" },
      { status: 403 }
    );
  }

  try {
    const { name, email, password, canCreateCompany, canCreateUser } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const newAdmin = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "ADMIN",
      permissions: {
        canCreateCompany: Boolean(canCreateCompany),
        canCreateUser: Boolean(canCreateUser),
      },
      createdBy: sessionUser.id,
    });

    await recordActivity({
      actorId: sessionUser.id,
      actorName: sessionUser.name,
      actorRole: sessionUser.role,
      actionType: "ADMIN_CREATED",
      description: `Super Admin created Admin "${newAdmin.name}" (${newAdmin.email})`,
      metadata: {
        adminId: newAdmin._id.toString(),
        permissions: newAdmin.permissions,
      },
    });

    return NextResponse.json(
      {
        admin: {
          _id: newAdmin._id.toString(),
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
          permissions: newAdmin.permissions,
          isActive: newAdmin.isActive,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create admin" },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export async function POST(req) {
  try {
    const { seedKey, name, email, password } = await req.json();

    if (!seedKey || seedKey !== process.env.SUPER_ADMIN_SEED_KEY) {
      return NextResponse.json({ error: "Invalid seed key" }, { status: 403 });
    }

    await connectDB();

    const existingSuperAdmin = await User.findOne({ role: "SUPER_ADMIN" });
    if (existingSuperAdmin) {
      return NextResponse.json(
        { error: "Super Admin already exists. Only one Super Admin is allowed." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const superAdmin = await User.create({
      name: name || "Nitai",
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "SUPER_ADMIN",
      permissions: { canCreateCompany: true, canCreateUser: true },
    });

    return NextResponse.json({
      message: "Super Admin created successfully",
      user: { id: superAdmin._id, name: superAdmin.name, email: superAdmin.email },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Seed failed" },
      { status: 500 }
    );
  }
}
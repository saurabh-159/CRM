import mongoose from "mongoose";
import { Company } from "@/models/Company";
import { User } from "@/models/User";

export async function getFreshUserContext(sessionUser) {
  const dbUser = await User.findById(sessionUser.id).lean();
  if (!dbUser || !dbUser.isActive) return null;

  return {
    id: dbUser._id.toString(),
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    companyId: dbUser.companyId ? dbUser.companyId.toString() : null,
    permissions: {
      canCreateCompany: Boolean(dbUser.permissions?.canCreateCompany),
      canCreateUser: Boolean(dbUser.permissions?.canCreateUser),
    },
  };
}

export async function getAccessibleCompanyIds(user) {
  if (user.role === "SUPER_ADMIN") {
    return null;
  }

  if (user.role === "ADMIN") {
    const companies = await Company.find({
      assignedAdmins: new mongoose.Types.ObjectId(user.id),
    })
      .select("_id")
      .lean();
    return companies.map((c) => c._id);
  }

  if (user.role === "USER" && user.companyId) {
    return [new mongoose.Types.ObjectId(user.companyId)];
  }

  return [];
}
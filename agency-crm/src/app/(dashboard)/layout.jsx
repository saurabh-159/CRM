import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getFreshUserContext } from "@/lib/permissions";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { PageTransition } from "@/components/layout/PageTransition";

export const instant = false;

export default async function DashboardLayout({ children }) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    redirect("/login");
  }

  await connectDB();
  const user = await getFreshUserContext(sessionUser);
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex bg-[var(--brand-white)]">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        <Topbar user={user} />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
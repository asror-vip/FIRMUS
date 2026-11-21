import { notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/admin-guard";
import { AdminDashboardClient } from "./admin-dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    notFound();
  }

  return <AdminDashboardClient />;
}

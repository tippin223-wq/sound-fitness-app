import type { ReactNode } from "react";
import MemberDashboardShell from "@/components/dashboard/MemberDashboardShell";

export default function PerformanceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <MemberDashboardShell>{children}</MemberDashboardShell>;
}

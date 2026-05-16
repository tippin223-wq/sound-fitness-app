import type { ReactNode } from "react";
import MemberDashboardShell from "@/components/dashboard/MemberDashboardShell";

export default function RecoveryLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <MemberDashboardShell>{children}</MemberDashboardShell>;
}

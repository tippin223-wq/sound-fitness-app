import MainDashboardPage from "@/app/dashboard/page";
import styles from "./CompactDashboard.module.css";

export default function AdminMainDashboardPreviewPage() {
  return (
    <div className={`main-dashboard-preview-embed ${styles.compact}`}>
      <MainDashboardPage />
    </div>
  );
}

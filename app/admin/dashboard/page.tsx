export default function CoachDashboardPage() {
  return (
    <div className="admin-dashboard-motion-static bg-[#020713]">
      <section className="bg-[#020713] text-white">
        <iframe
          className="block w-full border-0 bg-[#020713]"
          src="/main-dashboard-preview"
          style={{ height: "100dvh", minHeight: "720px" }}
          title="Main dashboard preview"
        />
      </section>
    </div>
  );
}

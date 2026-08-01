import { ReportTabs } from "./report-tabs";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="no-print mb-5">
        <ReportTabs />
      </div>
      {children}
    </>
  );
}

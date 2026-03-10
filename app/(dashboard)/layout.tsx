import { NavShell } from "@/components/NavShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <NavShell />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

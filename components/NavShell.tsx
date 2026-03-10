"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Mail,
  BarChart3,
  FileText,
  Target,
  FolderKanban,
  Bell,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Morning", icon: LayoutDashboard },
  { href: "/outreach", label: "Outreach", icon: Mail },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/revenue", label: "Revenue", icon: Target },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/review", label: "Weekly Review", icon: Target },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavShell() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col w-56 min-h-screen border-r border-slate-800 bg-slate-900/50">
      <div className="p-4 border-b border-slate-800">
        <Link href="/" className="text-lg font-semibold text-white">
          Command Centre
        </Link>
      </div>
      <ul className="flex-1 p-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition ${
                  isActive
                    ? "bg-cyan-600/20 text-cyan-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="p-2 border-t border-slate-800">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}

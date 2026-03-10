"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Mail,
  BarChart3,
  FileText,
  Target,
  FolderKanban,
  Bell,
  Settings,
  Bot,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Morning", icon: LayoutDashboard },
  { href: "/assistant", label: "Gandalf", icon: Bot },
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
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch("/api/outreach/unread-count");
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      } catch {}
    }
    fetchUnread();
    // Poll every 60 seconds
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Reset badge when entering Outreach
  useEffect(() => {
    if (pathname.startsWith("/outreach")) setUnreadCount(0);
  }, [pathname]);

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
          const showBadge = href === "/outreach" && unreadCount > 0;
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition ${
                  isActive && href === "/assistant"
                    ? "bg-zinc-600/40 text-zinc-200"
                    : isActive
                    ? "bg-cyan-600/20 text-cyan-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1">{label}</span>
                {showBadge && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
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

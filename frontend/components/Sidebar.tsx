"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Upload,
  BarChart2,
  Network,
  Briefcase,
  RefreshCw,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/alumni", label: "Alumni Database", icon: Users },
  { href: "/upload", label: "Upload Data", icon: Upload },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/network", label: "Network Graph", icon: Network },
  { href: "/opportunities", label: "Placement", icon: Briefcase },
  { href: "/linkedin", label: "LinkedIn Manager", icon: RefreshCw },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white leading-tight">
          Alumni Intelligence
        </h1>
        <p className="text-xs text-gray-400 mt-1">Career Analytics Platform</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">© 2024 Alumni Platform</p>
      </div>
    </aside>
  );
}

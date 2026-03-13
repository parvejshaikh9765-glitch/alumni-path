"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Briefcase, Building2, TrendingUp, Upload, BarChart2, Network, RefreshCw } from "lucide-react";
import { getAlumni, getPlacementOpportunities, type Alumni } from "@/lib/api";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  label,
  desc,
  icon: Icon,
  color,
}: {
  href: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow flex items-start gap-4 group"
    >
      <div className={`p-2.5 rounded-lg ${color} group-hover:scale-105 transition-transform`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="font-semibold text-gray-800 text-sm">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [opportunities, setOpportunities] = useState<Alumni[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAlumni({ limit: 100 }), getPlacementOpportunities()])
      .then(([all, opps]) => {
        setAlumni(all);
        setOpportunities(opps);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const industries = new Set(alumni.map((a) => a.industry).filter(Boolean)).size;
  const companies = new Set(alumni.map((a) => a.current_company).filter(Boolean)).size;
  const recent = [...alumni].slice(0, 6);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 mb-8">
        <h1 className="text-3xl font-bold mb-1">Alumni Intelligence Platform</h1>
        <p className="text-blue-100 text-sm">
          Track, analyze, and leverage your alumni network for career opportunities
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Alumni"
          value={loading ? "…" : alumni.length}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          label="Placement Opportunities"
          value={loading ? "…" : opportunities.length}
          icon={Briefcase}
          color="bg-green-500"
        />
        <StatCard
          label="Industries"
          value={loading ? "…" : industries}
          icon={TrendingUp}
          color="bg-purple-500"
        />
        <StatCard
          label="Companies"
          value={loading ? "…" : companies}
          icon={Building2}
          color="bg-orange-500"
        />
      </div>

      {/* Quick Links */}
      <h2 className="text-lg font-semibold text-gray-700 mb-3">Quick Access</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <QuickLink
          href="/alumni"
          label="Alumni Database"
          desc="Search and browse all alumni records"
          icon={Users}
          color="bg-blue-500"
        />
        <QuickLink
          href="/upload"
          label="Upload Data"
          desc="Import alumni data via Excel file"
          icon={Upload}
          color="bg-teal-500"
        />
        <QuickLink
          href="/analytics"
          label="Analytics"
          desc="Charts and insights on alumni careers"
          icon={BarChart2}
          color="bg-purple-500"
        />
        <QuickLink
          href="/network"
          label="Network Graph"
          desc="Visualize alumni connections"
          icon={Network}
          color="bg-indigo-500"
        />
        <QuickLink
          href="/opportunities"
          label="Placement Opportunities"
          desc="Alumni who can offer placements"
          icon={Briefcase}
          color="bg-green-500"
        />
        <QuickLink
          href="/linkedin"
          label="LinkedIn Manager"
          desc="Enrich and sync LinkedIn data"
          icon={RefreshCw}
          color="bg-sky-500"
        />
      </div>

      {/* Recent Alumni */}
      <h2 className="text-lg font-semibold text-gray-700 mb-3">Recent Alumni</h2>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : recent.length === 0 ? (
        <p className="text-gray-400 text-sm">No alumni data yet. Upload an Excel file to get started.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recent.map((a) => (
            <Link
              key={a.id}
              href={`/alumni/${a.id}`}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-gray-800 text-sm truncate">{a.name}</p>
                {a.is_placement_opportunity && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Opportunity
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {a.current_role ? `${a.current_role} @ ` : ""}
                {a.current_company || "—"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {a.graduation_year ? `Class of ${a.graduation_year}` : ""}
                {a.location ? ` · ${a.location}` : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

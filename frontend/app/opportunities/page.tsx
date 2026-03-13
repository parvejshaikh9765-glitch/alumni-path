"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Briefcase, Filter } from "lucide-react";
import { getPlacementOpportunities, type Alumni } from "@/lib/api";

const ROLE_FILTERS = ["All", "HR", "Founder", "Executive", "Manager", "Director", "VP", "CTO", "CEO"];

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Alumni[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("All");

  useEffect(() => {
    getPlacementOpportunities()
      .then(setOpportunities)
      .catch(() => setOpportunities([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = roleFilter === "All"
    ? opportunities
    : opportunities.filter((a) =>
        a.current_role?.toLowerCase().includes(roleFilter.toLowerCase())
      );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Placement Opportunities</h1>
          <p className="text-sm text-gray-500 mt-1">
            Alumni who can offer internships, referrals, or placements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Filter size={12} /> Filter by role:
          </span>
          <div className="flex flex-wrap gap-1">
            {ROLE_FILTERS.map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  roleFilter === r
                    ? "bg-green-600 text-white border-green-600"
                    : "border-gray-200 text-gray-600 hover:border-green-400"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No placement opportunities found</p>
          <p className="text-sm mt-1">
            {roleFilter !== "All"
              ? "Try a different role filter"
              : "Mark alumni as opportunities from their profile page"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-gray-800">{a.name}</p>
                  <p className="text-sm text-blue-600">
                    {a.current_role}
                    {a.current_company ? ` @ ${a.current_company}` : ""}
                  </p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                  🎯 Opportunity
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                {a.location && <span>📍 {a.location}</span>}
                {a.industry && <span>🏭 {a.industry}</span>}
                {a.graduation_year && <span>🎓 {a.graduation_year}</span>}
              </div>

              {a.placement_reason && (
                <p className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg mb-3">
                  {a.placement_reason}
                </p>
              )}

              <div className="flex gap-2">
                <a
                  href={`/alumni/${a.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View Profile
                </a>
                {a.linkedin_url && (
                  <a
                    href={a.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline"
                  >
                    <ExternalLink size={11} /> LinkedIn
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-sm text-gray-400 mt-4 text-right">
          Showing {filtered.length} of {opportunities.length} opportunities
        </p>
      )}
    </div>
  );
}

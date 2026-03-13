"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Eye } from "lucide-react";
import { getAlumni, type Alumni } from "@/lib/api";

const PAGE_SIZE = 20;

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-gray-200 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function AlumniPage() {
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    name: "",
    industry: "",
    company: "",
    role: "",
    location: "",
    graduation_year: "",
  });

  const fetchAlumni = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number | boolean> = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params[k] = v;
    });
    getAlumni(params)
      .then((data) => setAlumni(data))
      .catch(() => setAlumni([]))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    fetchAlumni();
    setPage(1);
  }, [fetchAlumni]);

  const paged = alumni.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(alumni.length / PAGE_SIZE);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Alumni Database</h1>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {(
          [
            { key: "name", placeholder: "Name" },
            { key: "industry", placeholder: "Industry" },
            { key: "company", placeholder: "Company" },
            { key: "role", placeholder: "Role" },
            { key: "location", placeholder: "Location" },
            { key: "graduation_year", placeholder: "Grad Year" },
          ] as { key: keyof typeof filters; placeholder: string }[]
        ).map(({ key, placeholder }) => (
          <div key={key} className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={placeholder}
              value={filters[key]}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, [key]: e.target.value }))
              }
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Name", "Grad Year", "Course", "Current Role", "Company", "Industry", "Location", "Actions"].map(
                (h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              : paged.length === 0
              ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    No alumni found. Try adjusting your filters.
                  </td>
                </tr>
              )
              : paged.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                    <td className="px-4 py-3 text-gray-500">{a.graduation_year ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">{a.course ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate">{a.current_role ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate">{a.current_company ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">{a.industry ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">{a.location ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/alumni/${a.id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        <Eye size={13} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, alumni.length)} of {alumni.length}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

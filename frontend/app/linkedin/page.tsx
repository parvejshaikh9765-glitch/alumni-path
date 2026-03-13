"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import {
  getLinkedInNeedsUpdate,
  enrichLinkedIn,
  enrichAllLinkedIn,
  type Alumni,
} from "@/lib/api";

interface Toast {
  id: number;
  text: string;
  type: "success" | "error";
}

let toastId = 0;

export default function LinkedInPage() {
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrichingId, setEnrichingId] = useState<number | null>(null);
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (text: string, type: "success" | "error") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchData = () => {
    setLoading(true);
    getLinkedInNeedsUpdate()
      .then(setAlumni)
      .catch(() => setAlumni([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnrich = async (id: number) => {
    setEnrichingId(id);
    try {
      await enrichLinkedIn(id);
      addToast("LinkedIn data refreshed successfully", "success");
      fetchData();
    } catch {
      addToast("Failed to enrich LinkedIn data", "error");
    } finally {
      setEnrichingId(null);
    }
  };

  const handleEnrichAll = async () => {
    setEnrichingAll(true);
    setConfirmAll(false);
    try {
      await enrichAllLinkedIn();
      addToast("All LinkedIn profiles queued for enrichment", "success");
      fetchData();
    } catch {
      addToast("Failed to start enrichment", "error");
    } finally {
      setEnrichingAll(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
              t.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {t.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {t.text}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">LinkedIn Manager</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and enrich alumni LinkedIn profiles
          </p>
        </div>
        <button
          onClick={() => setConfirmAll(true)}
          disabled={enrichingAll}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          <RefreshCw size={15} className={enrichingAll ? "animate-spin" : ""} />
          {enrichingAll ? "Enriching All…" : "Enrich All"}
        </button>
      </div>

      {/* Confirm All modal */}
      {confirmAll && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 mb-2">Enrich All LinkedIn?</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will trigger LinkedIn enrichment for all alumni who need an update. This may take some time.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAll(false)}
                className="text-sm px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEnrichAll}
                className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-700">
        {loading ? "Loading…" : `${alumni.length} alumni need LinkedIn update`}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Name", "Role / Company", "Last Updated", "Status", "LinkedIn", "Actions"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : alumni.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                  All LinkedIn profiles are up to date!
                </td>
              </tr>
            ) : (
              alumni.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">
                    {a.current_role}
                    {a.current_company ? ` @ ${a.current_company}` : ""}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(a.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {a.linkedin_verified ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        <CheckCircle size={11} /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        <AlertCircle size={11} /> Needs Update
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {a.linkedin_url ? (
                      <a
                        href={a.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline"
                      >
                        <ExternalLink size={11} /> View
                      </a>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEnrich(a.id)}
                      disabled={enrichingId === a.id}
                      className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg hover:bg-blue-100 disabled:opacity-60"
                    >
                      <RefreshCw
                        size={11}
                        className={enrichingId === a.id ? "animate-spin" : ""}
                      />
                      {enrichingId === a.id ? "…" : "Enrich"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, CheckCircle, AlertCircle, Clock, RefreshCw, Briefcase } from "lucide-react";
import { getAlumniById, enrichLinkedIn, markOpportunity, type Alumni } from "@/lib/api";

function TimelineItem({
  role,
  company,
  industry,
  location,
  start_year,
  end_year,
}: {
  role: string;
  company: string;
  industry?: string;
  location?: string;
  start_year?: number;
  end_year?: number;
}) {
  return (
    <div className="relative pl-8 pb-6">
      <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
      <div className="absolute left-1.5 top-4 bottom-0 w-0.5 bg-gray-200" />
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <p className="font-semibold text-gray-800">{role}</p>
            <p className="text-sm text-blue-600 font-medium">{company}</p>
          </div>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
            {start_year ?? "?"} – {end_year ?? "Present"}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
          {industry && <span>📊 {industry}</span>}
          {location && <span>📍 {location}</span>}
        </div>
      </div>
    </div>
  );
}

export default function AlumniProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [alumni, setAlumni] = useState<Alumni | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    getAlumniById(id)
      .then(setAlumni)
      .catch(() => setMsg({ text: "Failed to load alumni", type: "error" }))
      .finally(() => setLoading(false));
  }, [id]);

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      const updated = await enrichLinkedIn(id);
      setAlumni((prev) => ({ ...prev!, ...updated }));
      setMsg({ text: "LinkedIn data refreshed", type: "success" });
    } catch {
      setMsg({ text: "Enrichment failed", type: "error" });
    } finally {
      setEnriching(false);
    }
  };

  const handleMarkOpportunity = async () => {
    if (!reason.trim()) return;
    try {
      const updated = await markOpportunity(id, reason);
      setAlumni((prev) => ({ ...prev!, ...updated }));
      setShowModal(false);
      setMsg({ text: "Marked as placement opportunity", type: "success" });
    } catch {
      setMsg({ text: "Failed to mark opportunity", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!alumni) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Alumni not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-blue-600 text-sm">
          Go back
        </button>
      </div>
    );
  }

  const linkedInStatus = alumni.linkedin_verified
    ? { label: "Verified", color: "bg-green-100 text-green-700", icon: CheckCircle }
    : alumni.needs_update
    ? { label: "Needs Update", color: "bg-yellow-100 text-yellow-700", icon: AlertCircle }
    : { label: "Unverified", color: "bg-gray-100 text-gray-600", icon: Clock };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5"
      >
        <ArrowLeft size={15} /> Back
      </button>

      {/* Toast */}
      {msg && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${
            msg.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{alumni.name}</h1>
              {alumni.is_placement_opportunity && (
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                  🎯 Placement Opportunity
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">
              {alumni.current_role}
              {alumni.current_company ? ` @ ${alumni.current_company}` : ""}
            </p>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
              {alumni.graduation_year && <span>🎓 Class of {alumni.graduation_year}</span>}
              {alumni.course && <span>📚 {alumni.course}</span>}
              {alumni.location && <span>📍 {alumni.location}</span>}
              {alumni.industry && <span>🏭 {alumni.industry}</span>}
            </div>
            {alumni.placement_reason && (
              <p className="mt-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                Reason: {alumni.placement_reason}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            {/* LinkedIn Status */}
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${linkedInStatus.color}`}>
              <linkedInStatus.icon size={12} />
              {linkedInStatus.label}
            </span>
            {alumni.linkedin_url && (
              <a
                href={alumni.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg"
              >
                <ExternalLink size={12} /> LinkedIn
              </a>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-5 flex-wrap">
          <button
            onClick={handleEnrich}
            disabled={enriching}
            className="inline-flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            <RefreshCw size={14} className={enriching ? "animate-spin" : ""} />
            {enriching ? "Enriching…" : "Enrich LinkedIn"}
          </button>
          {!alumni.is_placement_opportunity && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Briefcase size={14} /> Mark as Opportunity
            </button>
          )}
        </div>
      </div>

      {/* Career Timeline */}
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Career Timeline</h2>
      {alumni.career_history.length === 0 ? (
        <p className="text-gray-400 text-sm">No career history available.</p>
      ) : (
        <div className="relative">
          {[...alumni.career_history]
            .sort((a, b) => (b.start_year ?? 0) - (a.start_year ?? 0))
            .map((job) => (
              <TimelineItem
                key={job.id}
                role={job.role}
                company={job.company}
                industry={job.industry}
                location={job.location}
                start_year={job.start_year}
                end_year={job.end_year}
              />
            ))}
        </div>
      )}

      {/* Mark Opportunity Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-800 mb-3">Mark as Placement Opportunity</h3>
            <p className="text-sm text-gray-500 mb-4">
              Why is <strong>{alumni.name}</strong> a placement opportunity?
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. HR Manager at Google, can refer students..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="text-sm px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkOpportunity}
                disabled={!reason.trim()}
                className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

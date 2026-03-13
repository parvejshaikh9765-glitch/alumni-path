"use client";

import { useState, useRef, DragEvent } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from "lucide-react";
import { uploadExcel, type UploadResponse } from "@/lib/api";

const MAX_SIZE_MB = 20;

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): string | null => {
    if (!f.name.endsWith(".xlsx")) return "Only .xlsx files are accepted.";
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return `File size must be under ${MAX_SIZE_MB}MB.`;
    return null;
  };

  const handleFile = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setResult(null);
    setFile(f);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadExcel(file);
      setResult(res);
      setFile(null);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Upload Alumni Data</h1>
      <p className="text-sm text-gray-500 mb-6">
        Import alumni records via an Excel (.xlsx) file. Max size: {MAX_SIZE_MB}MB.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-300 hover:bg-gray-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Upload size={40} className="mx-auto text-gray-400 mb-3" />
        {file ? (
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-blue-700">
            <FileSpreadsheet size={18} />
            {file.name}
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="ml-1 text-gray-400 hover:text-red-500"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">
              Drag & drop your .xlsx file here, or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-1">Only Excel (.xlsx) files accepted</p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 mt-4 text-sm text-red-700 bg-red-50 px-4 py-3 rounded-lg">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {uploading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Upload size={16} /> Upload File
          </>
        )}
      </button>

      {/* Results */}
      {result && (
        <div className="mt-6 bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4 text-green-700">
            <CheckCircle size={18} />
            <span className="font-semibold">Upload Complete</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: "Total Rows", value: result.total_rows },
              { label: "Created", value: result.alumni_created },
              { label: "Updated", value: result.alumni_updated },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
          {result.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-600 mb-2">Errors ({result.errors.length}):</p>
              <ul className="text-xs text-red-600 bg-red-50 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Template guide */}
      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-5">
        <h2 className="font-semibold text-blue-800 mb-3">Expected Excel Columns</h2>
        <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
          {[
            ["name", "Full name (required)"],
            ["graduation_year", "e.g. 2020"],
            ["course", "Degree / Programme"],
            ["current_company", "Current employer"],
            ["current_role", "Job title"],
            ["industry", "Sector / Industry"],
            ["location", "City or Country"],
            ["linkedin_url", "LinkedIn profile URL"],
            ["email", "Contact email"],
          ].map(([col, desc]) => (
            <div key={col} className="flex gap-2">
              <code className="font-mono bg-blue-100 px-1 rounded text-xs">{col}</code>
              <span className="text-xs text-blue-600">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

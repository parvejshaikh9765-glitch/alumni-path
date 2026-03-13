import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

export interface CareerHistory {
  id: number;
  alumni_id: number;
  company: string;
  role: string;
  start_year?: number;
  end_year?: number;
  industry?: string;
  location?: string;
  source: string;
}

export interface Alumni {
  id: number;
  name: string;
  graduation_year?: number;
  course?: string;
  current_company?: string;
  current_role?: string;
  industry?: string;
  location?: string;
  linkedin_url?: string;
  email?: string;
  is_placement_opportunity: boolean;
  placement_reason?: string;
  linkedin_verified: boolean;
  needs_update: boolean;
  created_at: string;
  updated_at: string;
  career_history: CareerHistory[];
}

export interface UploadResponse {
  message: string;
  total_rows: number;
  alumni_created: number;
  alumni_updated: number;
  errors: string[];
}

export interface AnalyticsData {
  top_companies: { company: string; count: number }[];
  industry_distribution: { industry: string; count: number; percentage: number }[];
  geography: { location: string; count: number }[];
  graduation_years: { graduation_year: number; count: number }[];
}

export const getAlumni = async (
  params?: Record<string, string | number | boolean>
): Promise<Alumni[]> => {
  const res = await api.get("/api/alumni", { params });
  return res.data;
};

export const getAlumniById = async (id: number): Promise<Alumni> => {
  const res = await api.get(`/api/alumni/${id}`);
  return res.data;
};

export const getAlumniTimeline = async (id: number): Promise<CareerHistory[]> => {
  const res = await api.get(`/api/alumni/${id}/timeline`);
  return res.data;
};

export const uploadExcel = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getTopCompanies = async (): Promise<{ company: string; count: number }[]> => {
  const res = await api.get("/api/analytics/top-companies");
  return res.data;
};

export const getIndustryDistribution = async (): Promise<
  { industry: string; count: number; percentage: number }[]
> => {
  const res = await api.get("/api/analytics/industry-distribution");
  return res.data;
};

export const getGeography = async (): Promise<{ location: string; count: number }[]> => {
  const res = await api.get("/api/analytics/geography");
  return res.data;
};

export const getGraduationYears = async (): Promise<
  { graduation_year: number; count: number }[]
> => {
  const res = await api.get("/api/analytics/graduation-years");
  return res.data;
};

export interface NetworkNode {
  id: string;
  label: string;
  type: string;
  [key: string]: unknown;
}

export interface NetworkEdge {
  source: string;
  target: string;
  [key: string]: unknown;
}

export const getNetworkGraph = async (): Promise<{ nodes: NetworkNode[]; edges: NetworkEdge[] }> => {
  const res = await api.get("/api/analytics/network-graph");
  return res.data;
};

export const getPlacementOpportunities = async (): Promise<Alumni[]> => {
  const res = await api.get("/api/alumni/opportunities");
  return res.data;
};

export const getCareerGrowth = async (): Promise<Record<string, unknown>> => {
  const res = await api.get("/api/analytics/career-growth");
  return res.data;
};

export const enrichLinkedIn = async (alumniId: number): Promise<Partial<Alumni>> => {
  const res = await api.post(`/api/alumni/${alumniId}/enrich-linkedin`);
  return res.data;
};

export const enrichAllLinkedIn = async (): Promise<{ message: string }> => {
  const res = await api.post("/api/alumni/enrich-all-linkedin");
  return res.data;
};

export const getLinkedInNeedsUpdate = async (): Promise<Alumni[]> => {
  const res = await api.get("/api/alumni/linkedin-needs-update");
  return res.data;
};

export const deleteAlumni = async (id: number): Promise<void> => {
  await api.delete(`/api/alumni/${id}`);
};

export const markOpportunity = async (id: number, reason: string): Promise<Alumni> => {
  const res = await api.post(`/api/alumni/${id}/mark-opportunity`, { reason });
  return res.data;
};

export default api;

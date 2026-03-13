"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  getTopCompanies,
  getIndustryDistribution,
  getGeography,
  getGraduationYears,
} from "@/lib/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444",
  "#6366f1", "#14b8a6", "#f97316", "#ec4899", "#84cc16",
];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function LoadingChart() {
  return <div className="h-64 bg-gray-100 rounded animate-pulse" />;
}

export default function AnalyticsPage() {
  const [companies, setCompanies] = useState<{ company: string; count: number }[]>([]);
  const [industries, setIndustries] = useState<{ industry: string; count: number; percentage: number }[]>([]);
  const [geo, setGeo] = useState<{ location: string; count: number }[]>([]);
  const [years, setYears] = useState<{ graduation_year: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getTopCompanies(),
      getIndustryDistribution(),
      getGeography(),
      getGraduationYears(),
    ])
      .then(([c, i, g, y]) => {
        setCompanies(c.slice(0, 15));
        setIndustries(i.slice(0, 10));
        setGeo(g.slice(0, 12));
        setYears(y.sort((a, b) => a.graduation_year - b.graduation_year));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Companies */}
        <ChartCard title="Top Companies">
          {loading ? (
            <LoadingChart />
          ) : companies.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">No data available</p>
          ) : (
            <div className="h-80 overflow-y-auto">
              <Bar
                data={{
                  labels: companies.map((c) => c.company),
                  datasets: [
                    {
                      label: "Alumni Count",
                      data: companies.map((c) => c.count),
                      backgroundColor: "#3b82f6",
                      borderRadius: 4,
                    },
                  ],
                }}
                options={{
                  indexAxis: "y",
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { beginAtZero: true, ticks: { stepSize: 1 } },
                    y: { ticks: { font: { size: 11 } } },
                  },
                }}
              />
            </div>
          )}
        </ChartCard>

        {/* Industry Distribution */}
        <ChartCard title="Industry Distribution">
          {loading ? (
            <LoadingChart />
          ) : industries.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">No data available</p>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <Doughnut
                data={{
                  labels: industries.map((i) => i.industry),
                  datasets: [
                    {
                      data: industries.map((i) => i.count),
                      backgroundColor: COLORS,
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: "right", labels: { font: { size: 11 }, boxWidth: 12 } },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${ctx.parsed} (${industries[ctx.dataIndex]?.percentage?.toFixed(1)}%)`,
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </ChartCard>

        {/* Geographic Distribution */}
        <ChartCard title="Geographic Distribution">
          {loading ? (
            <LoadingChart />
          ) : geo.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">No data available</p>
          ) : (
            <div className="h-72">
              <Bar
                data={{
                  labels: geo.map((g) => g.location),
                  datasets: [
                    {
                      label: "Alumni",
                      data: geo.map((g) => g.count),
                      backgroundColor: "#10b981",
                      borderRadius: 4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { font: { size: 10 }, maxRotation: 45 } },
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                  },
                }}
              />
            </div>
          )}
        </ChartCard>

        {/* Graduation Year Distribution */}
        <ChartCard title="Graduation Year Distribution">
          {loading ? (
            <LoadingChart />
          ) : years.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">No data available</p>
          ) : (
            <div className="h-72">
              <Line
                data={{
                  labels: years.map((y) => String(y.graduation_year)),
                  datasets: [
                    {
                      label: "Graduates",
                      data: years.map((y) => y.count),
                      borderColor: "#8b5cf6",
                      backgroundColor: "rgba(139,92,246,0.1)",
                      fill: true,
                      tension: 0.4,
                      pointRadius: 4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                  },
                }}
              />
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

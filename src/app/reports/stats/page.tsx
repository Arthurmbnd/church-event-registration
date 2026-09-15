
"use client";

import {
  ArrowLeft,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

type DistrictStat = {
  name: string;
  attendees: number;
  days: number;
};

type SimpleStat = {
  name: string;
  value: number;
};

type GenderByDistrictStat = {
  name: string;
  male: number;
  female: number;
};

type DistrictServiceStat = {
  district: string;
  service: string;
  attendance: number;
};

type AttendanceStatistics = {
  registered_count: number;
  checked_in_count: number;
  check_in_rate: number;
  total_attendees: number;
  districts: DistrictStat[];
  gender: SimpleStat[];
  membership: SimpleStat[];
  gender_by_district: GenderByDistrictStat[];
  services: SimpleStat[];
  district_services: DistrictServiceStat[];
  daily: {
    day: number;
    attendees: number;
  }[];
};

const PIE_COLORS = ["#2563eb", "#c026d3"];
const MEMBERSHIP_COLORS = ["#059669", "#d97706"];

const SERVICE_COLORS = [
  "#c026d3",
  "#2563eb",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#0891b2",
];

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-base font-black text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <div className="mt-5 h-72">
        {children}
      </div>
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 text-center text-xs font-semibold text-slate-400">
      {message}
    </div>
  );
}

export default function ReportStatsPage() {
  const router = useRouter();

  const [stats, setStats] =
    useState<AttendanceStatistics | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: role, error: roleError } =
      await supabase.rpc("get_my_role");

    if (
      roleError ||
      String(role).trim().toLowerCase() !== "admin"
    ) {
      router.replace("/reports");
      return;
    }

    try {
      const { data, error: statisticsError } =
        await supabase.rpc("get_attendance_statistics");

      if (statisticsError) {
        throw statisticsError;
      }

      if (!data) {
        throw new Error(
          "Unable to load attendance statistics."
        );
      }

      setStats(data as AttendanceStatistics);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load statistics."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStats();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadStats]);

  const districtServiceData = stats
    ? Object.values(
        stats.district_services.reduce(
          (
            grouped: Record<
              string,
              {
                district: string;
                [service: string]: string | number;
              }
            >,
            item
          ) => {
            if (!grouped[item.district]) {
              grouped[item.district] = {
                district: item.district,
              };
            }

            grouped[item.district][item.service] =
              item.attendance;

            return grouped;
          },
          {}
        )
      )
    : [];

  const districtServiceNames = stats
    ? Array.from(
        new Set(
          stats.district_services.map(
            (item) => item.service
          )
        )
      )
    : [];

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-blue-600 text-white shadow-sm">
                <BarChart3 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.15em] text-fuchsia-600">
                  Admin analytics
                </p>

                <h1 className="truncate text-lg font-black text-slate-900">
                  Attendance statistics
                </h1>
              </div>
            </div>

            <Link
              href="/reports"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-fuchsia-200 hover:bg-fuchsia-50 hover:text-fuchsia-700 sm:px-4 sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Reports
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-700 via-purple-700 to-blue-700 p-6 text-white shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-fuchsia-100">
                  Full attendance dataset
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  See the shape of the event
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                  Compare districts, demographics, membership,
                  and service demand from the full attendance
                  dataset.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-xl bg-white/10 px-3 py-3 text-center backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-white/65">
                    Registered
                  </p>

                  <p className="mt-1 text-lg font-black">
                    {stats?.registered_count ?? 0}
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 px-3 py-3 text-center backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-white/65">
                    Checked in
                  </p>

                  <p className="mt-1 text-lg font-black">
                    {stats?.checked_in_count ?? 0}
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 px-3 py-3 text-center backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-white/65">
                    Check-in rate
                  </p>

                  <p className="mt-1 text-lg font-black">
                    {(stats?.check_in_rate ?? 0).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </section>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-fuchsia-600" />

              <p className="mt-3 text-sm font-bold text-slate-700">
                Loading full attendance statistics...
              </p>
            </div>
          ) : stats ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <ChartCard
                title="Attendance by district"
                description="Service attendance records grouped by district and service."
              >
                {stats.district_services.length ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={districtServiceData}
                      margin={{
                        left: -20,
                        right: 8,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                      />

                      <XAxis
                        dataKey="district"
                        tick={{ fontSize: 10 }}
                      />

                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10 }}
                      />

                      <Tooltip />

                      <Legend
                        wrapperStyle={{ fontSize: 11 }}
                      />

                      {districtServiceNames.map(
                        (service, index) => (
                          <Bar
                            key={service}
                            dataKey={service}
                            name={service}
                            fill={
                              SERVICE_COLORS[
                                index %
                                  SERVICE_COLORS.length
                              ]
                            }
                            radius={[5, 5, 0, 0]}
                          />
                        )
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="No district service attendance data available." />
                )}
              </ChartCard>

              <ChartCard
                title="Gender distribution"
                description="Breakdown of male and female checked-in attendees."
              >
                {stats.gender.length ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <PieChart>
                      <Pie
                        data={stats.gender}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={92}
                        label
                      >
                        {stats.gender.map(
                          (entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={
                                PIE_COLORS[
                                  index %
                                    PIE_COLORS.length
                                ]
                              }
                            />
                          )
                        )}
                      </Pie>

                      <Tooltip />

                      <Legend
                        wrapperStyle={{ fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="No gender data available." />
                )}
              </ChartCard>

              <ChartCard
                title="Members and visitors"
                description="Membership status among checked-in attendees."
              >
                {stats.membership.length ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <PieChart>
                      <Pie
                        data={stats.membership}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={92}
                        label
                      >
                        {stats.membership.map(
                          (entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={
                                MEMBERSHIP_COLORS[
                                  index %
                                    MEMBERSHIP_COLORS.length
                                ]
                              }
                            />
                          )
                        )}
                      </Pie>

                      <Tooltip />

                      <Legend
                        wrapperStyle={{ fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="No membership data available." />
                )}
              </ChartCard>

              <ChartCard
                title="Gender by district"
                description="Compare male and female checked-in attendees across locations."
              >
                {stats.gender_by_district.length ? (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={stats.gender_by_district}
                      margin={{
                        left: -20,
                        right: 8,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                      />

                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                      />

                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10 }}
                      />

                      <Tooltip />

                      <Legend
                        wrapperStyle={{ fontSize: 11 }}
                      />

                      <Bar
                        dataKey="male"
                        name="Male"
                        fill="#2563eb"
                        radius={[5, 5, 0, 0]}
                      />

                      <Bar
                        dataKey="female"
                        name="Female"
                        fill="#c026d3"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="No gender-by-district data available." />
                )}
              </ChartCard>

              <div className="lg:col-span-2">
                <ChartCard
                  title="Service attendance"
                  description="Total attendance records grouped by service name across all event days."
                >
                  {stats.services.length ? (
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <BarChart
                        data={stats.services}
                        layout="vertical"
                        margin={{
                          left: 20,
                          right: 20,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                        />

                        <XAxis
                          type="number"
                          allowDecimals={false}
                          tick={{ fontSize: 10 }}
                        />

                        <YAxis
                          type="category"
                          dataKey="name"
                          width={110}
                          tick={{ fontSize: 10 }}
                        />

                        <Tooltip />

                        <Bar
                          dataKey="value"
                          name="Attendance"
                          fill="#059669"
                          radius={[0, 5, 5, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart message="No service attendance data available." />
                  )}
                </ChartCard>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </AuthGuard>
  );
}



"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";

type ReportAttendee = {
  attendee_id: string;
  registration_number: string;
  full_name: string;
  phone: string | null;
  church: string | null;
  location: string | null;
  day_1: string | null;
  day_2: string | null;
  day_3: string | null;
  day_4: string | null;
  day_5: string | null;
  days_attended: number;
  attendance_percentage: number;
};

export default function ReportsPage() {
  const [attendees, setAttendees] = useState<ReportAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [churchFilter, setChurchFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  async function loadReport() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.rpc("get_attendance_report");

    if (error) {
      console.error(error);
      setError(error.message);
      setLoading(false);
      return;
    }

    setAttendees((data || []) as ReportAttendee[]);
    setLoading(false);
  }

  useEffect(() => {
    loadReport();
  }, []);

  const churches = useMemo(() => {
    return Array.from(
      new Set(
        attendees
          .map((a) => a.church)
          .filter((church): church is string => Boolean(church))
      )
    ).sort();
  }, [attendees]);

  const locations = useMemo(() => {
    return Array.from(
      new Set(
        attendees
          .map((a) => a.location)
          .filter((location): location is string => Boolean(location))
      )
    ).sort();
  }, [attendees]);

  const filteredAttendees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return attendees.filter((attendee) => {
      const matchesSearch =
        !query ||
        attendee.full_name.toLowerCase().includes(query) ||
        attendee.registration_number.toLowerCase().includes(query) ||
        (attendee.phone || "").toLowerCase().includes(query);

      const matchesChurch =
        !churchFilter || attendee.church === churchFilter;

      const matchesLocation =
        !locationFilter || attendee.location === locationFilter;

      return matchesSearch && matchesChurch && matchesLocation;
    });
  }, [attendees, search, churchFilter, locationFilter]);

  const stats = useMemo(() => {
    const registered = attendees.length;

    const dayTotals = [1, 2, 3, 4, 5].map((day) =>
      attendees.filter(
        (attendee) =>
          attendee[`day_${day}` as keyof ReportAttendee] !== null
      ).length
    );

    const totalCheckIns = attendees.reduce(
      (total, attendee) => total + attendee.days_attended,
      0
    );

    const fullAttendance = attendees.filter(
      (attendee) => attendee.days_attended === 5
    ).length;

    const partialAttendance = attendees.filter(
      (attendee) =>
        attendee.days_attended > 0 && attendee.days_attended < 5
    ).length;

    const averageAttendance =
      registered > 0
        ? attendees.reduce(
            (total, attendee) => total + attendee.attendance_percentage,
            0
          ) / registered
        : 0;

    return {
      registered,
      dayTotals,
      totalCheckIns,
      fullAttendance,
      partialAttendance,
      averageAttendance,
    };
  }, [attendees]);

  function formatDate(value: string | null) {
    if (!value) return "—";

    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function exportCSV() {
    const headers = [
      "Registration Number",
      "Full Name",
      "Phone",
      "Church",
      "Location",
      "Day 1",
      "Day 2",
      "Day 3",
      "Day 4",
      "Day 5",
      "Days Attended",
      "Attendance %",
    ];

    const rows = filteredAttendees.map((attendee) => [
      attendee.registration_number,
      attendee.full_name,
      attendee.phone || "",
      attendee.church || "",
      attendee.location || "",
      attendee.day_1 || "",
      attendee.day_2 || "",
      attendee.day_3 || "",
      attendee.day_4 || "",
      attendee.day_5 || "",
      attendee.days_attended,
      attendee.attendance_percentage,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? "");
            return `"${text.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "attendance-report.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setSearch("");
    setChurchFilter("");
    setLocationFilter("");
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
        {/* Brand Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#4c176f] via-[#741b82] to-[#1f3c96]">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#f4c542] blur-3xl" />
            <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[#61b9e9] blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link
                  href="/"
                  className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-100 transition hover:text-white"
                >
                  <span>←</span>
                  Back to Dashboard
                </Link>

                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl shadow-lg ring-1 ring-white/20 backdrop-blur">
                    📊
                  </div>

                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                      Attendance Reports
                    </h1>

                    <p className="mt-1 text-sm text-blue-100">
                      Registration and 5-day attendance overview
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={loadReport}
                  disabled={loading}
                  className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white shadow-sm backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Loading..." : "↻ Refresh"}
                </button>

                <button
                  onClick={exportCSV}
                  disabled={filteredAttendees.length === 0}
                  className="rounded-xl bg-[#f4c542] px-4 py-2.5 text-sm font-extrabold text-[#4c176f] shadow-lg shadow-black/10 transition hover:bg-[#ffd85b] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ↓ Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Error */}
          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
              <strong>Error loading report:</strong> {error}
            </div>
          )}

          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              title="Registered"
              value={stats.registered}
              accent="purple"
            />

            <StatCard
              title="Total Check-ins"
              value={stats.totalCheckIns}
              accent="blue"
            />

            <StatCard
              title="Avg. Attendance"
              value={`${stats.averageAttendance.toFixed(1)}%`}
              accent="gold"
            />

            <StatCard
              title="Full Attendance"
              value={stats.fullAttendance}
              accent="green"
            />

            <StatCard
              title="Partial Attendance"
              value={stats.partialAttendance}
              accent="magenta"
            />

            <StatCard
              title="Showing"
              value={filteredAttendees.length}
              accent="lightBlue"
            />
          </div>

          {/* Daily Attendance */}
          <section className="mb-6 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_8px_30px_rgba(31,60,150,0.07)]">
            <div className="border-b border-blue-50 bg-gradient-to-r from-purple-50 via-white to-blue-50 px-4 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#f4c542]" />
                    <h2 className="text-lg font-extrabold text-[#34124f]">
                      Daily Attendance
                    </h2>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    Number of attendees checked in each day
                  </p>
                </div>

                <span className="hidden rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#1f3c96] sm:inline-flex">
                  5-Day Overview
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-5 gap-2 sm:gap-4">
                {stats.dayTotals.map((total, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-blue-100 bg-gradient-to-b from-white to-blue-50/60 p-3 text-center transition hover:-translate-y-0.5 hover:shadow-md sm:p-4"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#741b82] sm:text-xs">
                      Day {index + 1}
                    </p>

                    <p className="mt-1 text-xl font-extrabold text-[#1f3c96] sm:text-2xl">
                      {total}
                    </p>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#741b82] via-[#1f3c96] to-[#61b9e9]"
                        style={{
                          width:
                            stats.registered > 0
                              ? `${Math.min(
                                  100,
                                  (total / stats.registered) * 100
                                )}%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Filters */}
          <section className="mb-6 rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_8px_30px_rgba(31,60,150,0.06)] sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-[#741b82]">
                🔎
              </div>

              <div>
                <h2 className="font-extrabold text-[#34124f]">
                  Filter Report
                </h2>

                <p className="text-xs text-slate-500">
                  Narrow the attendance records
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Search
                </label>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, registration number or phone"
                  className="w-full rounded-xl border border-blue-100 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#741b82] focus:bg-white focus:ring-4 focus:ring-purple-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Church
                </label>

                <select
                  value={churchFilter}
                  onChange={(e) => setChurchFilter(e.target.value)}
                  className="w-full rounded-xl border border-blue-100 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-[#741b82] focus:bg-white focus:ring-4 focus:ring-purple-100"
                >
                  <option value="">All churches</option>

                  {churches.map((church) => (
                    <option key={church} value={church}>
                      {church}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Location
                </label>

                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full rounded-xl border border-blue-100 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-[#741b82] focus:bg-white focus:ring-4 focus:ring-purple-100"
                >
                  <option value="">All locations</option>

                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(search || churchFilter || locationFilter) && (
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500">
                  Filters are currently active
                </p>

                <button
                  onClick={clearFilters}
                  className="text-sm font-bold text-[#741b82] transition hover:text-[#1f3c96]"
                >
                  Clear filters
                </button>
              </div>
            )}
          </section>

          {/* Loading */}
          {loading && (
            <div className="rounded-2xl border border-blue-100 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-50">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-purple-100 border-t-[#741b82]" />
              </div>

              <p className="text-sm font-semibold text-slate-600">
                Loading attendance report...
              </p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filteredAttendees.length === 0 && (
            <div className="rounded-2xl border border-blue-100 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                📋
              </div>

              <p className="text-lg font-extrabold text-[#34124f]">
                No attendees found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or filters.
              </p>
            </div>
          )}

          {/* Mobile Cards */}
          {!loading && filteredAttendees.length > 0 && (
            <div className="space-y-3 md:hidden">
              {filteredAttendees.map((attendee) => (
                <div
                  key={attendee.attendee_id}
                  className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_5px_20px_rgba(31,60,150,0.06)]"
                >
                  <div className="border-b border-blue-50 bg-gradient-to-r from-purple-50/70 via-white to-blue-50/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-extrabold text-[#34124f]">
                          {attendee.full_name}
                        </h3>

                        <p className="mt-1 text-xs font-semibold text-[#1f3c96]">
                          {attendee.registration_number}
                        </p>
                      </div>

                      <AttendanceBadge
                        percentage={attendee.attendance_percentage}
                      />
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <InfoItem
                        label="Phone"
                        value={attendee.phone || "—"}
                      />

                      <InfoItem
                        label="Church"
                        value={attendee.church || "—"}
                      />

                      <InfoItem
                        label="Location"
                        value={attendee.location || "—"}
                      />

                      <InfoItem
                        label="Days"
                        value={`${attendee.days_attended}/5`}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((day) => {
                        const attended =
                          attendee[
                            `day_${day}` as keyof ReportAttendee
                          ] !== null;

                        return (
                          <div
                            key={day}
                            className={`rounded-lg p-2 text-center text-xs font-bold ${
                              attended
                                ? "border border-green-200 bg-green-50 text-green-700"
                                : "border border-slate-100 bg-slate-50 text-slate-300"
                            }`}
                          >
                            <div>Day {day}</div>

                            <div className="mt-1 text-sm">
                              {attended ? "✓" : "—"}
                            </div>

                            {attended && (
                              <div className="mt-1 text-[10px] font-normal">
                                {formatDate(
                                  attendee[
                                    `day_${day}` as keyof ReportAttendee
                                  ] as string
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Desktop Table */}
          {!loading && filteredAttendees.length > 0 && (
            <div className="hidden overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_8px_30px_rgba(31,60,150,0.07)] md:block">
              <div className="overflow-x-auto">
                <table className="min-w-[1200px] w-full text-left text-sm">
                  <thead className="border-b border-purple-100 bg-gradient-to-r from-[#4c176f] via-[#741b82] to-[#1f3c96] text-white">
                    <tr>
                      <th className="px-4 py-3.5 font-bold">
                        Registration
                      </th>

                      <th className="px-4 py-3.5 font-bold">
                        Name
                      </th>

                      <th className="px-4 py-3.5 font-bold">
                        Phone
                      </th>

                      <th className="px-4 py-3.5 font-bold">
                        Church
                      </th>

                      <th className="px-4 py-3.5 font-bold">
                        Location
                      </th>

                      {[1, 2, 3, 4, 5].map((day) => (
                        <th
                          key={day}
                          className="px-3 py-3.5 text-center font-bold"
                        >
                          Day {day}
                        </th>
                      ))}

                      <th className="px-4 py-3.5 text-center font-bold">
                        Days
                      </th>

                      <th className="px-4 py-3.5 text-center font-bold">
                        Attendance
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-blue-50">
                    {filteredAttendees.map((attendee) => (
                      <tr
                        key={attendee.attendee_id}
                        className="transition hover:bg-blue-50/50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-bold text-[#741b82]">
                          {attendee.registration_number}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-800">
                          {attendee.full_name}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {attendee.phone || "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {attendee.church || "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {attendee.location || "—"}
                        </td>

                        {[1, 2, 3, 4, 5].map((day) => {
                          const value =
                            attendee[
                              `day_${day}` as keyof ReportAttendee
                            ] as string | null;

                          return (
                            <td
                              key={day}
                              className="px-3 py-3 text-center"
                            >
                              {value ? (
                                <div>
                                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-50 font-extrabold text-green-600">
                                    ✓
                                  </span>

                                  <div className="mt-1 text-[10px] font-medium text-slate-400">
                                    {formatDate(value)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="px-4 py-3 text-center font-extrabold text-[#1f3c96]">
                          {attendee.days_attended}/5
                        </td>

                        <td className="px-4 py-3 text-center">
                          <AttendanceBadge
                            percentage={attendee.attendance_percentage}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer */}
          {!loading && filteredAttendees.length > 0 && (
            <div className="mt-4 flex flex-col gap-1 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing{" "}
                <span className="font-extrabold text-[#741b82]">
                  {filteredAttendees.length}
                </span>{" "}
                of{" "}
                <span className="font-extrabold text-[#1f3c96]">
                  {attendees.length}
                </span>{" "}
                registered attendees.
              </p>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100 sm:w-32">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#741b82] to-[#1f3c96]"
                  style={{
                    width:
                      attendees.length > 0
                        ? `${Math.min(
                            100,
                            (filteredAttendees.length / attendees.length) *
                              100
                          )}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}

function StatCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: string | number;
  accent:
    | "purple"
    | "blue"
    | "gold"
    | "green"
    | "magenta"
    | "lightBlue";
}) {
  const accents = {
    purple: {
      bar: "bg-[#741b82]",
      icon: "bg-purple-100 text-[#741b82]",
    },
    blue: {
      bar: "bg-[#1f3c96]",
      icon: "bg-blue-100 text-[#1f3c96]",
    },
    gold: {
      bar: "bg-[#f4c542]",
      icon: "bg-yellow-100 text-[#9a7410]",
    },
    green: {
      bar: "bg-green-500",
      icon: "bg-green-100 text-green-700",
    },
    magenta: {
      bar: "bg-[#b21f8a]",
      icon: "bg-pink-100 text-[#b21f8a]",
    },
    lightBlue: {
      bar: "bg-[#61b9e9]",
      icon: "bg-sky-100 text-[#1975a8]",
    },
  };

  const current = accents[accent];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_5px_20px_rgba(31,60,150,0.05)]">
      <div
        className={`absolute inset-x-0 top-0 h-1 ${current.bar}`}
      />

      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {title}
        </p>

        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold ${current.icon}`}
        >
          •
        </span>
      </div>

      <p className="mt-2 text-xl font-extrabold tracking-tight text-[#34124f] sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-blue-50 bg-slate-50 p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#741b82]/70">
        {label}
      </p>

      <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function AttendanceBadge({
  percentage,
}: {
  percentage: number;
}) {
  let className = "border-slate-200 bg-slate-100 text-slate-600";

  if (percentage === 100) {
    className = "border-green-200 bg-green-50 text-green-700";
  } else if (percentage >= 50) {
    className = "border-yellow-200 bg-yellow-50 text-[#9a7410]";
  } else if (percentage > 0) {
    className = "border-orange-200 bg-orange-50 text-orange-700";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold ${className}`}
    >
      {percentage.toFixed(1)}%
    </span>
  );
}


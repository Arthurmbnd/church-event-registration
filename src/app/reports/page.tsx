
"use client";

import {
  BarChart3,
  Check,
  Edit3,
  Trash2,
  UserRoundCog,
  CalendarDays,
  CheckCircle2,
  Download,
  Filter,
  RefreshCw,
  Search,
  Users,
  UserCheck,
  UserRound,
  UserRoundCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

type Gender = "male" | "female";
type MembershipStatus = "member" | "visitor";

type ReportAttendee = {
  attendee_id: string;
  registration_number: string;
  full_name: string;
  phone: string | null;
  church: string | null;
  location: string | null;
  gender: Gender | null;
  membership_status: MembershipStatus | null;
  day_1: string | null;
  day_2: string | null;
  day_3: string | null;
  day_4: string | null;
  day_5: string | null;
  days_attended: number;
  attendance_percentage: number;
};

type AttendanceRecord = {
  attendance_id: string;
  event_day: number;
  service_id: string | null;
  service_name: string;
  start_time: string | null;
  end_time: string | null;
  attended_at: string;
};

function formatServiceTime(record: AttendanceRecord) {
  if (record.start_time && record.end_time) {
    return ` (${record.start_time.slice(0, 5)}–${record.end_time.slice(0, 5)})`;
  }
  if (record.start_time) {
    return ` (${record.start_time.slice(0, 5)})`;
  }
  return '';
}

function formatAttendanceDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatGender(gender: Gender | null) {
  if (!gender) return "Not set";
  return gender === "male" ? "Male" : "Female";
}

function formatMembership(status: MembershipStatus | null) {
  if (!status) return "Not set";
  return status === "member" ? "Member" : "Visitor";
}

function GenderBadge({
  gender,
}: {
  gender: Gender | null;
}) {
  if (!gender) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-400">
        Not set
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${
        gender === "male"
          ? "bg-blue-50 text-blue-700"
          : "bg-fuchsia-50 text-fuchsia-700"
      }`}
    >
      {formatGender(gender)}
    </span>
  );
}

function MembershipBadge({
  status,
}: {
  status: MembershipStatus | null;
}) {
  if (!status) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-400">
        Not set
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${
        status === "member"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {formatMembership(status)}
    </span>
  );
}

function AttendanceBadge({
  value,
}: {
  value: string | null;
}) {
  if (!value) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-400">
        —
      </span>
    );
  }

  return (
    <span className="inline-flex max-w-[220px] items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold leading-5 text-emerald-700">
      <CheckCircle2 className="h-3 w-3 shrink-0" />
      {value}
    </span>
  );
}

function SummaryMetric({
  label,
  value,
  description,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  accent: "fuchsia" | "blue" | "purple" | "emerald" | "amber";
}) {
  const styles = {
    fuchsia: {
      icon: "bg-fuchsia-50 text-fuchsia-600",
      label: "text-fuchsia-600",
    },
    blue: {
      icon: "bg-blue-50 text-blue-600",
      label: "text-blue-600",
    },
    purple: {
      icon: "bg-purple-50 text-purple-600",
      label: "text-purple-600",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-600",
      label: "text-emerald-600",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600",
      label: "text-amber-600",
    },
  };

  const style = styles[accent];

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.icon}`}
        >
          {icon}
        </div>

        <div
          className={`text-[10px] font-bold uppercase tracking-[0.14em] ${style.label}`}
        >
          Report
        </div>
      </div>

      <div className="mt-5">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {label}
        </div>

        <div className="mt-1 text-3xl font-black tracking-tight text-slate-900">
          {value}
        </div>

        {description && (
          <div className="mt-1 text-xs font-medium text-slate-400">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [attendees, setAttendees] = useState<ReportAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<ReportAttendee | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [managementLoading, setManagementLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAttendanceId, setDeletingAttendanceId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    church: "",
    location: "",
    gender: "",
    membership_status: "",
  });

  const [search, setSearch] = useState("");
  const [churchFilter, setChurchFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("");

  async function loadReport() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.rpc(
      "get_attendance_report"
    );

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

    supabase.rpc("get_my_role").then(({ data }) => {
      setIsAdmin(data === "admin");
    });
  }, []);

  function openEdit(attendee: ReportAttendee) {
    setSelectedAttendee(attendee);
    setShowDeleteConfirm(false);
    setSuccess("");
    setError("");
    setEditForm({
      full_name: attendee.full_name,
      phone: attendee.phone || "",
      church: attendee.church || "",
      location: attendee.location || "",
      gender: attendee.gender || "",
      membership_status: attendee.membership_status || "",
    });
    setAttendanceRecords([]);
    setManagementLoading(true);

    supabase
      .rpc("admin_get_attendee_attendance", {
        p_attendee_id: attendee.attendee_id,
      })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setAttendanceRecords((data || []) as AttendanceRecord[]);
        }
        setManagementLoading(false);
      });
  }

  function closeEdit() {
    if (savingEdit || deletingId || deletingAttendanceId) return;
    setSelectedAttendee(null);
    setAttendanceRecords([]);
    setShowDeleteConfirm(false);
  }

  async function saveAttendee() {
    if (!selectedAttendee) return;

    setSavingEdit(true);
    setError("");
    setSuccess("");

    const { data, error } = await supabase.rpc("admin_update_attendee", {
      p_attendee_id: selectedAttendee.attendee_id,
      p_full_name: editForm.full_name,
      p_phone: editForm.phone || null,
      p_church: editForm.church || null,
      p_location: editForm.location || null,
      p_gender: editForm.gender || null,
      p_membership_status: editForm.membership_status || null,
    });

    if (error) {
      setError(error.message);
      setSavingEdit(false);
      return;
    }

    const updated = data as {
      id: string;
      full_name: string;
      phone: string | null;
      church: string | null;
      location: string | null;
      gender: Gender | null;
      membership_status: MembershipStatus | null;
    };
    setAttendees((current) =>
      current.map((item) =>
        item.attendee_id === updated.id
          ? {
              ...item,
              full_name: updated.full_name,
              phone: updated.phone,
              church: updated.church,
              location: updated.location,
              gender: updated.gender,
              membership_status: updated.membership_status,
            }
          : item
      )
    );

    setSelectedAttendee((current) =>
      current
        ? {
            ...current,
            full_name: updated.full_name,
            phone: updated.phone,
            church: updated.church,
            location: updated.location,
            gender: updated.gender,
            membership_status: updated.membership_status,
          }
        : current
    );
    setSuccess("Attendee details updated successfully.");
    setSavingEdit(false);
  }

  async function deleteAttendance(attendanceId: string) {
    if (!selectedAttendee) return;
    if (!window.confirm("Remove this attendance record? This cannot be undone.")) return;

    setDeletingAttendanceId(attendanceId);
    setError("");
    setSuccess("");

    const { error } = await supabase.rpc("admin_delete_attendance", {
      p_attendance_id: attendanceId,
    });

    if (error) {
      setError(error.message);
      setDeletingAttendanceId(null);
      return;
    }

    setAttendanceRecords((current) =>
      current.filter((record) => record.attendance_id !== attendanceId)
    );
    setSuccess("Attendance record removed.");
    setDeletingAttendanceId(null);
    await loadReport();
  }

  async function deleteAttendee() {
    if (!selectedAttendee) return;

    setDeletingId(selectedAttendee.attendee_id);
    setError("");
    setSuccess("");

    const { error } = await supabase.rpc("admin_delete_attendee", {
      p_attendee_id: selectedAttendee.attendee_id,
    });

    if (error) {
      setError(error.message);
      setDeletingId(null);
      return;
    }

    setAttendees((current) =>
      current.filter((item) => item.attendee_id !== selectedAttendee.attendee_id)
    );
    setSuccess(`${selectedAttendee.full_name} was permanently deleted.`);
    setDeletingId(null);
    closeEdit();
  }

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

      const matchesGender =
        !genderFilter || attendee.gender === genderFilter;

      const matchesMembership =
        !membershipFilter ||
        attendee.membership_status === membershipFilter;

      return (
        matchesSearch &&
        matchesChurch &&
        matchesLocation &&
        matchesGender &&
        matchesMembership
      );
    });
  }, [
    attendees,
    search,
    churchFilter,
    locationFilter,
    genderFilter,
    membershipFilter,
  ]);

  const stats = useMemo(() => {
    const registered = attendees.length;

    const male = attendees.filter(
      (a) => a.gender === "male"
    ).length;

    const female = attendees.filter(
      (a) => a.gender === "female"
    ).length;

    const members = attendees.filter(
      (a) => a.membership_status === "member"
    ).length;

    const visitors = attendees.filter(
      (a) => a.membership_status === "visitor"
    ).length;

    const dayTotals = [1, 2, 3, 4, 5].map((day) =>
      attendees.filter(
        (attendee) =>
          attendee[
            `day_${day}` as keyof ReportAttendee
          ] !== null
      ).length
    );

    const totalCheckIns = attendees.reduce(
      (total, attendee) =>
        total + Number(attendee.days_attended || 0),
      0
    );

    const fullAttendance = attendees.filter(
      (attendee) =>
        Number(attendee.days_attended) === 5
    ).length;

    const partialAttendance = attendees.filter(
      (attendee) => {
        const days = Number(attendee.days_attended);
        return days > 0 && days < 5;
      }
    ).length;

    const averageAttendance =
      registered > 0
        ? attendees.reduce(
            (total, attendee) =>
              total +
              Number(attendee.attendance_percentage || 0),
            0
          ) / registered
        : 0;

    return {
      registered,
      male,
      female,
      members,
      visitors,
      dayTotals,
      totalCheckIns,
      fullAttendance,
      partialAttendance,
      averageAttendance,
    };
  }, [attendees]);

  function exportCSV() {
    const headers = [
      "Registration Number",
      "Full Name",
      "Phone",
      "Gender",
      "Member or Visitor",
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
      formatGender(attendee.gender),
      formatMembership(attendee.membership_status),
      attendee.church || "",
      attendee.location || "",
      attendee.day_1 || "",
      attendee.day_2 || "",
      attendee.day_3 || "",
      attendee.day_4 || "",
      attendee.day_5 || "",
      Number(attendee.days_attended || 0),
      Number(attendee.attendance_percentage || 0),
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

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setSearch("");
    setChurchFilter("");
    setLocationFilter("");
    setGenderFilter("");
    setMembershipFilter("");
  }

  const hasFilters = Boolean(
    search ||
      churchFilter ||
      locationFilter ||
      genderFilter ||
      membershipFilter
  );

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-50 text-slate-900">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-purple-600 text-base font-black text-white shadow-sm">
                F
              </div>

              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.15em] text-fuchsia-600">
                  Fountain of Victory Church
                </p>

                <p className="mt-0.5 truncate text-base font-bold text-slate-900 sm:text-lg">
                  Attendance Reports
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/"
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:border-fuchsia-200 hover:bg-fuchsia-50 hover:text-fuchsia-700 sm:px-4 sm:text-sm"
              >
                Dashboard
              </Link>

              <Link
                href="/check-in"
                className="rounded-xl bg-fuchsia-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-fuchsia-700 sm:px-4 sm:text-sm"
              >
                Check-in
              </Link>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Hero */}
          <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-700 via-purple-700 to-blue-700 shadow-sm">
            <div className="relative px-5 py-7 sm:px-7 sm:py-8">
              <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-fuchsia-100 ring-1 ring-white/15">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Attendance analytics
                  </div>

                  <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                    Attendance Report
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                    Registration, demographics and 5-day service attendance
                    in one place.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={loadReport}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        loading ? "animate-spin" : ""
                      }`}
                    />
                    {loading ? "Refreshing..." : "Refresh"}
                  </button>

                  <button
                    type="button"
                    onClick={exportCSV}
                    disabled={!filteredAttendees.length}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-fuchsia-700 shadow-sm transition hover:bg-fuchsia-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="font-bold">Unable to complete request</div>
              <div className="mt-1 break-words">{error}</div>
            </div>
          )}

          {success && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                {success}
              </div>
            </div>
          )}

          {/* Summary */}
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <SummaryMetric
              label="Registered"
              value={stats.registered}
              description="Total attendees"
              accent="fuchsia"
              icon={<Users className="h-5 w-5" />}
            />

            <SummaryMetric
              label="Members"
              value={stats.members}
              description="Registered members"
              accent="emerald"
              icon={<UserCheck className="h-5 w-5" />}
            />

            <SummaryMetric
              label="Visitors"
              value={stats.visitors}
              description="Registered visitors"
              accent="amber"
              icon={<Users className="h-5 w-5" />}
            />

            <SummaryMetric
              label="Male"
              value={stats.male}
              description="Male attendees"
              accent="blue"
              icon={<UserRound className="h-5 w-5" />}
            />

            <SummaryMetric
              label="Female"
              value={stats.female}
              description="Female attendees"
              accent="purple"
              icon={<UserRound className="h-5 w-5" />}
            />

            <SummaryMetric
              label="Avg. Attendance"
              value={`${stats.averageAttendance.toFixed(1)}%`}
              description="Across all attendees"
              accent="fuchsia"
              icon={<BarChart3 className="h-5 w-5" />}
            />
          </section>

          {/* Attendance overview */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <CalendarDays className="h-4.5 w-4.5" />
                  </div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Attendance Overview
                  </h2>
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Unique attendees checked in on each event day.
                </p>
              </div>

              <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                Live report data
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {stats.dayTotals.map((total, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:border-fuchsia-100 hover:bg-fuchsia-50/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-fuchsia-600">
                      Day {index + 1}
                    </span>

                    <CalendarDays className="h-4 w-4 text-slate-300" />
                  </div>

                  <div className="mt-3 text-2xl font-black text-slate-900">
                    {total}
                  </div>

                  <div className="mt-1 text-[11px] font-medium text-slate-400">
                    unique attendees
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-fuchsia-600">
                  Total attended days
                </div>

                <div className="mt-2 text-2xl font-black text-slate-900">
                  {stats.totalCheckIns}
                </div>

                <div className="mt-1 text-[11px] font-medium text-slate-400">
                  Distinct attendee-days
                </div>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                  Full attendance
                </div>

                <div className="mt-2 text-2xl font-black text-slate-900">
                  {stats.fullAttendance}
                </div>

                <div className="mt-1 text-[11px] font-medium text-slate-400">
                  Attended all 5 days
                </div>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-amber-600">
                  Partial attendance
                </div>

                <div className="mt-2 text-2xl font-black text-slate-900">
                  {stats.partialAttendance}
                </div>

                <div className="mt-1 text-[11px] font-medium text-slate-400">
                  Attended 1–4 days
                </div>
              </div>
            </div>
          </section>

          {/* Filters */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-fuchsia-50 text-fuchsia-600">
                    <Filter className="h-4 w-4" />
                  </div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Filters
                  </h2>
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Narrow the report by attendee information.
                </p>
              </div>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 self-start rounded-lg px-3 py-2 text-xs font-bold text-fuchsia-600 transition hover:bg-fuchsia-50 sm:self-auto"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear filters
                </button>
              )}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Search
                </label>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fuchsia-400" />

                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name, registration number or phone"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-fuchsia-300 focus:bg-white focus:ring-2 focus:ring-fuchsia-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Church
                </label>

                <select
                  value={churchFilter}
                  onChange={(e) =>
                    setChurchFilter(e.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-fuchsia-300 focus:bg-white focus:ring-2 focus:ring-fuchsia-100"
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
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Location
                </label>

                <select
                  value={locationFilter}
                  onChange={(e) =>
                    setLocationFilter(e.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-fuchsia-300 focus:bg-white focus:ring-2 focus:ring-fuchsia-100"
                >
                  <option value="">All locations</option>

                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Gender
                </label>

                <select
                  value={genderFilter}
                  onChange={(e) =>
                    setGenderFilter(e.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-fuchsia-300 focus:bg-white focus:ring-2 focus:ring-fuchsia-100"
                >
                  <option value="">All genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Type
                </label>

                <select
                  value={membershipFilter}
                  onChange={(e) =>
                    setMembershipFilter(e.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-fuchsia-300 focus:bg-white focus:ring-2 focus:ring-fuchsia-100"
                >
                  <option value="">Members & Visitors</option>
                  <option value="member">Members</option>
                  <option value="visitor">Visitors</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex flex-col justify-between gap-2 border-t border-slate-100 pt-4 text-xs sm:flex-row sm:items-center">
              <p className="font-medium text-slate-500">
                Showing{" "}
                <span className="font-black text-slate-900">
                  {filteredAttendees.length}
                </span>{" "}
                of{" "}
                <span className="font-black text-slate-900">
                  {attendees.length}
                </span>{" "}
                attendees
              </p>

              {hasFilters && (
                <p className="font-semibold text-fuchsia-600">
                  Filters active
                </p>
              )}
            </div>
          </section>

          {/* Loading */}
          {loading && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-50">
                <RefreshCw className="h-5 w-5 animate-spin text-fuchsia-600" />
              </span>

              <div className="mt-4 text-sm font-bold text-slate-700">
                Loading attendance report...
              </div>

              <p className="mt-1 text-xs font-medium text-slate-400">
                Gathering registration and attendance data.
              </p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && !filteredAttendees.length && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Users className="h-6 w-6" />
              </div>

              <div className="mt-4 text-lg font-bold text-slate-900">
                No attendees found
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Try changing or clearing your filters.
              </p>
            </div>
          )}

          {/* Mobile */}
          {!loading && filteredAttendees.length > 0 && (
            <div className="mt-6 space-y-4 md:hidden">
              {filteredAttendees.map((attendee) => (
                <div
                  key={attendee.attendee_id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="border-b border-slate-100 bg-gradient-to-r from-fuchsia-50 to-blue-50 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-black text-slate-900">
                          {attendee.full_name}
                        </div>

                        <div className="mt-1 font-mono text-[11px] font-semibold text-slate-500">
                          #{attendee.registration_number}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-xl font-black text-fuchsia-700">
                          {Number(
                            attendee.attendance_percentage || 0
                          ).toFixed(0)}
                          %
                        </div>

                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          attendance
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <GenderBadge gender={attendee.gender} />
                      <MembershipBadge
                        status={attendee.membership_status}
                      />
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Phone
                        </div>

                        <div className="mt-1 font-semibold text-slate-700">
                          {attendee.phone || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Church
                        </div>

                        <div className="mt-1 truncate font-semibold text-slate-700">
                          {attendee.church || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Location
                        </div>

                        <div className="mt-1 truncate font-semibold text-slate-700">
                          {attendee.location || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Days attended
                        </div>

                        <div className="mt-1 font-black text-slate-900">
                          {Number(attendee.days_attended || 0)} / 5
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-fuchsia-600">
                          Service Attendance
                        </div>

                        <div className="text-[10px] font-bold text-slate-400">
                          5 days
                        </div>
                      </div>

                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((day) => {
                          const value =
                            attendee[
                              `day_${day}` as keyof ReportAttendee
                            ] as string | null;

                          return (
                            <div
                              key={day}
                              className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5"
                            >
                              <div className="text-xs font-bold text-slate-600">
                                Day {day}
                              </div>

                              <AttendanceBadge value={value} />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() => openEdit(attendee)}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-2.5 text-xs font-black text-fuchsia-700 transition hover:bg-fuchsia-100"
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => { openEdit(attendee); setShowDeleteConfirm(true); }}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Desktop table */}
          {!loading && filteredAttendees.length > 0 && (
            <section className="mt-6 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
              <div className="border-b border-slate-100 bg-gradient-to-r from-fuchsia-50/60 to-blue-50/60 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      Attendee attendance
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Detailed registration, demographic and service
                      attendance records.
                    </p>
                  </div>

                  <div className="hidden items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 shadow-sm sm:flex">
                    <UserRoundCheck className="h-3.5 w-3.5 text-emerald-500" />
                    {filteredAttendees.length} records
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1620px] w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      {[
                        "Registration",
                        "Name",
                        "Gender",
                        "Type",
                        "Phone",
                        "Church",
                        "Location",
                        "Day 1",
                        "Day 2",
                        "Day 3",
                        "Day 4",
                        "Day 5",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500"
                        >
                          {heading}
                        </th>
                      ))}

                      <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Days
                      </th>

                      <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Attendance
                      </th>

                      {isAdmin && (
                        <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredAttendees.map((attendee) => (
                      <tr
                        key={attendee.attendee_id}
                        className="transition hover:bg-fuchsia-50/30"
                      >
                        <td className="whitespace-nowrap px-4 py-4 font-mono text-[11px] font-semibold text-slate-500">
                          #{attendee.registration_number}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="font-bold text-slate-900">
                            {attendee.full_name}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <GenderBadge gender={attendee.gender} />
                        </td>

                        <td className="px-4 py-4">
                          <MembershipBadge
                            status={attendee.membership_status}
                          />
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                          {attendee.phone || "—"}
                        </td>

                        <td className="max-w-[180px] truncate px-4 py-4 font-medium text-slate-600">
                          {attendee.church || "—"}
                        </td>

                        <td className="max-w-[180px] truncate px-4 py-4 font-medium text-slate-600">
                          {attendee.location || "—"}
                        </td>

                        <td className="px-4 py-4">
                          <AttendanceBadge
                            value={attendee.day_1}
                          />
                        </td>

                        <td className="px-4 py-4">
                          <AttendanceBadge
                            value={attendee.day_2}
                          />
                        </td>

                        <td className="px-4 py-4">
                          <AttendanceBadge
                            value={attendee.day_3}
                          />
                        </td>

                        <td className="px-4 py-4">
                          <AttendanceBadge
                            value={attendee.day_4}
                          />
                        </td>

                        <td className="px-4 py-4">
                          <AttendanceBadge
                            value={attendee.day_5}
                          />
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex min-w-12 items-center justify-center rounded-full bg-fuchsia-50 px-2.5 py-1.5 text-xs font-black text-fuchsia-700">
                            {Number(
                              attendee.days_attended || 0
                            )}
                            /5
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="font-black text-slate-900">
                            {Number(
                              attendee.attendance_percentage || 0
                            ).toFixed(0)}
                            %
                          </div>

                          <div className="mx-auto mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    Number(
                                      attendee.attendance_percentage || 0
                                    )
                                  )
                                )}%`,
                              }}
                            />
                          </div>
                        </td>

                        {isAdmin && (
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(attendee)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-xs font-black text-fuchsia-700 transition hover:bg-fuchsia-100"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => { openEdit(attendee); setShowDeleteConfirm(true); }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs font-medium text-slate-500">
                Each day shows the service or services attended. Multiple
                services on the same day count as one attended day.
                {isAdmin && " Admin controls are available for editing or removing records."}
              </div>
            </section>
          )}
        </div>

        {isAdmin && selectedAttendee && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
              <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-600">
                      <UserRoundCog className="h-3.5 w-3.5" />
                      Admin management
                    </div>
                    <h2 className="mt-1 truncate text-lg font-black text-slate-950">
                      {selectedAttendee.full_name}
                    </h2>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                      #{selectedAttendee.registration_number}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-6 p-5 sm:p-6">
                {managementLoading ? (
                  <div className="rounded-2xl bg-slate-50 p-8 text-center">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin text-fuchsia-600" />
                    <p className="mt-3 text-sm font-bold text-slate-700">Loading attendance records...</p>
                  </div>
                ) : (
                  <>
                    <section>
                      <div className="mb-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-600">
                          Personal details
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Update the attendee's registration information.</p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {[
                          ["full_name", "Full name", "text", "Enter full name"],
                          ["phone", "Phone", "text", "Phone number"],
                          ["church", "Church", "text", "Church name"],
                          ["location", "Location", "text", "Location"],
                        ].map(([key, label, type, placeholder]) => (
                          <div key={key}>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                              {label}
                            </label>
                            <input
                              type={type}
                              value={editForm[key as keyof typeof editForm]}
                              onChange={(event) => setEditForm((current) => ({ ...current, [key]: event.target.value }))}
                              placeholder={placeholder}
                              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium outline-none transition focus:border-fuchsia-300 focus:bg-white focus:ring-2 focus:ring-fuchsia-100"
                            />
                          </div>
                        ))}

                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Gender</label>
                          <select
                            value={editForm.gender}
                            onChange={(event) => setEditForm((current) => ({ ...current, gender: event.target.value }))}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium outline-none transition focus:border-fuchsia-300 focus:bg-white focus:ring-2 focus:ring-fuchsia-100"
                          >
                            <option value="">Not set</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Member or Visitor</label>
                          <select
                            value={editForm.membership_status}
                            onChange={(event) => setEditForm((current) => ({ ...current, membership_status: event.target.value }))}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium outline-none transition focus:border-fuchsia-300 focus:bg-white focus:ring-2 focus:ring-fuchsia-100"
                          >
                            <option value="">Not set</option>
                            <option value="member">Member</option>
                            <option value="visitor">Visitor</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={saveAttendee}
                        disabled={savingEdit}
                        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-700 via-purple-700 to-blue-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                      >
                        {savingEdit ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        {savingEdit ? "Saving changes..." : "Save changes"}
                      </button>
                    </section>

                    <section className="border-t border-slate-100 pt-6">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Attendance records</p>
                          <p className="mt-1 text-xs text-slate-500">Remove an accidental check-in without deleting the attendee.</p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                          {attendanceRecords.length} record{attendanceRecords.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2">
                        {attendanceRecords.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-medium text-slate-400">
                            No attendance records.
                          </div>
                        ) : (
                          attendanceRecords.map((record) => (
                            <div key={record.attendance_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-800">Day {record.event_day} · {record.service_name}{formatServiceTime(record)}</p>
                                <p className="mt-1 text-[10px] font-medium text-slate-400">Checked in {formatAttendanceDate(record.attended_at)}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteAttendance(record.attendance_id)}
                                disabled={deletingAttendanceId === record.attendance_id}
                                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 text-[10px] font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                              >
                                {deletingAttendanceId === record.attendance_id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                Remove
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="border-t border-red-100 pt-6">
                      <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-red-900">Delete attendee permanently</p>
                            <p className="mt-1 text-xs leading-5 text-red-800/70">This removes the attendee and all of their attendance records. This cannot be undone.</p>
                          </div>
                        </div>
                        {showDeleteConfirm ? (
                          <div className="mt-4 rounded-xl border border-red-200 bg-white p-3">
                            <p className="text-xs font-bold text-slate-700">Delete {selectedAttendee.full_name} permanently?</p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={deletingId !== null} className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-600">Cancel</button>
                              <button type="button" onClick={deleteAttendee} disabled={deletingId !== null} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-black text-white disabled:opacity-50">
                                {deletingId ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                {deletingId ? "Deleting..." : "Yes, delete"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setShowDeleteConfirm(true)} className="mt-4 w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-xs font-black text-red-700 transition hover:bg-red-100">
                            Delete this attendee
                          </button>
                        )}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <footer className="mt-10 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 text-center text-[11px] font-medium text-slate-400 sm:px-6 lg:px-8">
            Fountain of Victory Church · Attendance Management System
          </div>
        </footer>
      </main>
    </AuthGuard>
  );
}



"use client";

import {
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Edit3,
  Filter,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserRound,
  UserRoundCheck,
  UserRoundCog,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

/* =========================================================
   Types
========================================================= */

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
  day_6: string | null;
  days_attended: number;
  attendance_percentage: number;

  // Service-based individual attendance
  services_attended: number;
  total_services: number;
  service_attendance_percentage: number;
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

/* =========================================================
   Constants
========================================================= */

const PAGE_SIZE = 50;
const EVENT_DAY_COUNT = 6;

/* =========================================================
   Helpers
========================================================= */

function formatServiceTime(record: AttendanceRecord) {
  if (record.start_time && record.end_time) {
    return ` (${record.start_time.slice(
      0,
      5
    )}–${record.end_time.slice(0, 5)})`;
  }

  if (record.start_time) {
    return ` (${record.start_time.slice(0, 5)})`;
  }

  return "";
}

function formatAttendanceDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatGender(gender: Gender | null) {
  if (!gender) return "Not set";

  return gender === "male" ? "Male" : "Female";
}

function formatMembership(
  status: MembershipStatus | null
) {
  if (!status) return "Not set";

  return status === "member" ? "Member" : "Visitor";
}

function getDayValue(
  attendee: ReportAttendee,
  day: number
): string | null {
  return attendee[
    `day_${day}` as keyof ReportAttendee
  ] as string | null;
}

/* =========================================================
   Shared classes
========================================================= */

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-fuchsia-300 focus:bg-white focus:ring-2 focus:ring-fuchsia-100";

const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500";

/* =========================================================
   Gender Badge
========================================================= */

const GenderBadge = memo(function GenderBadge({
  gender,
}: {
  gender: Gender | null;
}) {
  if (!gender) {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-400">
        Not set
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold ${
        gender === "male"
          ? "bg-blue-50 text-blue-700"
          : "bg-fuchsia-50 text-fuchsia-700"
      }`}
    >
      {formatGender(gender)}
    </span>
  );
});

/* =========================================================
   Membership Badge
========================================================= */

const MembershipBadge = memo(function MembershipBadge({
  status,
}: {
  status: MembershipStatus | null;
}) {
  if (!status) {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-400">
        Not set
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold ${
        status === "member"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {formatMembership(status)}
    </span>
  );
});

/* =========================================================
   Attendance Badge
========================================================= */

const AttendanceBadge = memo(function AttendanceBadge({
  value,
}: {
  value: string | null;
}) {
  if (!value) {
    return (
      <span className="inline-flex h-7 w-full max-w-[200px] items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-300">
        —
      </span>
    );
  }

  return (
    <span className="inline-flex h-7 w-full max-w-[200px] items-center gap-1.5 truncate rounded-lg bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700">
      <CheckCircle2 className="h-3 w-3 shrink-0" />

      <span className="truncate">{value}</span>
    </span>
  );
});

/* =========================================================
   Summary Metric
========================================================= */

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
  accent:
    | "fuchsia"
    | "blue"
    | "purple"
    | "emerald"
    | "amber";
}) {
  const styles = {
    fuchsia: {
      icon: "bg-fuchsia-50 text-fuchsia-600",
      dot: "bg-fuchsia-500",
    },
    blue: {
      icon: "bg-blue-50 text-blue-600",
      dot: "bg-blue-500",
    },
    purple: {
      icon: "bg-purple-50 text-purple-600",
      dot: "bg-purple-500",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-600",
      dot: "bg-emerald-500",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600",
      dot: "bg-amber-500",
    },
  }[accent];

  return (
    <div className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-fuchsia-100 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
        >
          {icon}
        </div>

        <span
          className={`mt-1 h-2 w-2 rounded-full ${styles.dot}`}
        />
      </div>

      <div className="mt-auto pt-5">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </div>

        <div className="mt-1 text-3xl font-black leading-none tracking-tight text-slate-900">
          {value}
        </div>

        {description && (
          <div className="mt-2 text-xs font-medium text-slate-400">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   Section Header
========================================================= */

function SectionHeader({
  icon,
  title,
  subtitle,
  accent = "fuchsia",
  right,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accent?: "fuchsia" | "blue";
  right?: React.ReactNode;
}) {
  const accentCls =
    accent === "fuchsia"
      ? "bg-fuchsia-50 text-fuchsia-600"
      : "bg-blue-50 text-blue-600";

  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accentCls}`}
        >
          {icon}
        </div>

        <div>
          <h2 className="text-lg font-black leading-tight text-slate-900">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {right}
    </div>
  );
}

/* =========================================================
   Mobile Attendee Card
========================================================= */

const MobileAttendeeCard = memo(function MobileAttendeeCard({
  attendee,
  isAdmin,
  open,
  onToggle,
  onEdit,
  onDelete,
}: {
  attendee: ReportAttendee;
  isAdmin: boolean;
  open: boolean;
  onToggle: () => void;
  onEdit: (a: ReportAttendee) => void;
  onDelete: (a: ReportAttendee) => void;
}) {
  const percentage = Math.min(
    100,
    Math.max(
      0,
      Number(
        attendee.service_attendance_percentage || 0
      )
    )
  );

  const gradientId = `mobileGrad-${attendee.attendee_id}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ===============================================
          Compact summary
      ================================================ */}

      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Attendance percentage */}
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <svg
              className="h-12 w-12 -rotate-90"
              viewBox="0 0 36 36"
            >
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#F1F5F9"
                strokeWidth="3"
              />

              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth="3"
                strokeDasharray={`${percentage} ${
                  100 - percentage
                }`}
                strokeLinecap="round"
              />

              <defs>
                <linearGradient
                  id={gradientId}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#C026D3"
                  />

                  <stop
                    offset="100%"
                    stopColor="#7C3AED"
                  />
                </linearGradient>
              </defs>
            </svg>

            <span className="absolute text-[11px] font-black text-slate-900">
              {percentage.toFixed(0)}%
            </span>
          </div>

          {/* Name and registration */}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-slate-900">
              {attendee.full_name}
            </div>

            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-[10px] font-semibold text-slate-400">
                #{attendee.registration_number}
              </span>

              <span className="text-slate-200">
                •
              </span>

              <span className="text-[10px] font-bold text-slate-500">
                {Number(
                  attendee.services_attended || 0
                )}
                /
                {Number(
                  attendee.total_services || 0
                )}{" "}
                services
              </span>
            </div>
          </div>
        </div>

        {/* Basic badges */}
        <div className="mt-3 flex items-center gap-2">
          <GenderBadge gender={attendee.gender} />

          <MembershipBadge
            status={attendee.membership_status}
          />
        </div>

        {/* Details dropdown */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`attendee-details-${attendee.attendee_id}`}
          className="mt-4 flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-left transition hover:border-fuchsia-200 hover:bg-fuchsia-50/40 active:bg-fuchsia-50"
        >
          <span className="text-xs font-black text-fuchsia-700">
            {open
              ? "Hide full details"
              : "View full details"}
          </span>

          <ChevronDown
            className={`h-4 w-4 text-fuchsia-500 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* ===============================================
          Full details dropdown
      ================================================ */}

      {open && (
        <div
          id={`attendee-details-${attendee.attendee_id}`}
          className="border-t border-slate-100 bg-slate-50/60 p-4"
        >
          {/* Person information */}
          <div>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-fuchsia-600">
              Person Information
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white p-3">
                <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  Phone
                </div>

                <div className="mt-1 break-words text-xs font-bold text-slate-700">
                  {attendee.phone ||
                    "Not provided"}
                </div>
              </div>

              <div className="rounded-xl bg-white p-3">
                <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  Gender
                </div>

                <div className="mt-1 text-xs font-bold text-slate-700">
                  {formatGender(attendee.gender)}
                </div>
              </div>

              <div className="rounded-xl bg-white p-3">
                <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  Church
                </div>

                <div className="mt-1 break-words text-xs font-bold text-slate-700">
                  {attendee.church ||
                    "Not provided"}
                </div>
              </div>

              <div className="rounded-xl bg-white p-3">
                <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  Type
                </div>

                <div className="mt-1 text-xs font-bold text-slate-700">
                  {formatMembership(
                    attendee.membership_status
                  )}
                </div>
              </div>

              <div className="col-span-2 rounded-xl bg-white p-3">
                <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  Location
                </div>

                <div className="mt-1 break-words text-xs font-bold text-slate-700">
                  {attendee.location ||
                    "Not provided"}
                </div>
              </div>
            </div>
          </div>

          {/* Service attendance */}
          <div className="mt-5 border-t border-slate-200/70 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-600">
                  Service Attendance
                </div>

                <div className="mt-1 text-[10px] font-medium text-slate-400">
                  {Number(
                    attendee.services_attended || 0
                  )}{" "}
                  of{" "}
                  {Number(
                    attendee.total_services || 0
                  )}{" "}
                  services attended
                </div>
              </div>

              <div className="rounded-full bg-fuchsia-50 px-2.5 py-1 text-[10px] font-black text-fuchsia-700">
                {percentage.toFixed(0)}%
              </div>
            </div>

            {/* Day-by-day list remains unchanged */}
            <div className="space-y-1.5">
              {Array.from(
                { length: EVENT_DAY_COUNT },
                (_, index) => index + 1
              ).map((day) => {
                const value = getDayValue(
                  attendee,
                  day
                );

                return (
                  <div
                    key={day}
                    className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5"
                  >
                    <div className="w-12 shrink-0 text-xs font-black text-slate-600">
                      Day {day}
                    </div>

                    <div className="min-w-0 flex-1">
                      {value ? (
                        <div className="flex min-w-0 items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />

                          <span className="truncate text-[11px] font-bold text-emerald-700">
                            {value}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-300">
                          Not attended
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-200/70 pt-5">
              <button
                type="button"
                onClick={() => onEdit(attendee)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-fuchsia-200 bg-white px-3 py-2.5 text-xs font-black text-fuchsia-700 transition hover:bg-fuchsia-50"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </button>

              <button
                type="button"
                onClick={() => onDelete(attendee)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/* =========================================================
   Desktop Row
========================================================= */

const DesktopRow = memo(function DesktopRow({
  attendee,
  index,
  isAdmin,
  onEdit,
  onDelete,
}: {
  attendee: ReportAttendee;
  index: number;
  isAdmin: boolean;
  onEdit: (a: ReportAttendee) => void;
  onDelete: (a: ReportAttendee) => void;
}) {
  const percentage = Math.min(
    100,
    Math.max(
      0,
      Number(
        attendee.service_attendance_percentage || 0
      )
    )
  );

  return (
    <tr
      className={`group transition hover:bg-fuchsia-50/40 ${
        index % 2 === 1
          ? "bg-slate-50/40"
          : "bg-white"
      }`}
    >
      <td className="border-b border-slate-100 px-4 py-3.5 align-middle font-mono text-[11px] font-semibold text-slate-500">
        #{attendee.registration_number}
      </td>

      <td className="border-b border-slate-100 px-4 py-3.5 align-middle">
        <div className="truncate font-bold text-slate-900">
          {attendee.full_name}
        </div>
      </td>

      <td className="border-b border-slate-100 px-4 py-3.5 align-middle">
        <GenderBadge gender={attendee.gender} />
      </td>

      <td className="border-b border-slate-100 px-4 py-3.5 align-middle">
        <MembershipBadge
          status={attendee.membership_status}
        />
      </td>

      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3.5 align-middle text-slate-600">
        {attendee.phone || "—"}
      </td>

      <td className="border-b border-slate-100 px-4 py-3.5 align-middle">
        <div className="truncate font-medium text-slate-600">
          {attendee.church || "—"}
        </div>
      </td>

      <td className="border-b border-slate-100 px-4 py-3.5 align-middle">
        <div className="truncate font-medium text-slate-600">
          {attendee.location || "—"}
        </div>
      </td>

      {Array.from(
        { length: EVENT_DAY_COUNT },
        (_, index) => index + 1
      ).map((day) => (
        <td
          key={day}
          className="border-b border-slate-100 px-4 py-3.5 align-middle"
        >
          <AttendanceBadge
            value={getDayValue(attendee, day)}
          />
        </td>
      ))}

      <td className="border-b border-slate-100 px-4 py-3.5 text-center align-middle">
        <span className="inline-flex min-w-[52px] items-center justify-center rounded-full bg-fuchsia-50 px-2.5 py-1 text-xs font-black text-fuchsia-700">
          {Number(
            attendee.services_attended || 0
          )}
          /
          {Number(
            attendee.total_services || 0
          )}
        </span>
      </td>

      <td className="border-b border-slate-100 px-4 py-3.5 align-middle">
        <div className="flex flex-col items-center gap-1">
          <div className="font-black leading-none text-slate-900">
            {percentage.toFixed(0)}%
          </div>

          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600"
              style={{
                width: `${percentage}%`,
              }}
            />
          </div>
        </div>
      </td>

      {isAdmin && (
        <td className="border-b border-slate-100 px-4 py-3.5 align-middle">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onEdit(attendee)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-xs font-black text-fuchsia-700 transition hover:bg-fuchsia-100"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </button>

            <button
              type="button"
              onClick={() => onDelete(attendee)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 transition hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </td>
      )}
    </tr>
  );
});

/* =========================================================
   Main Page
========================================================= */

export default function ReportsPage() {
  const [attendees, setAttendees] = useState<
    ReportAttendee[]
  >([]);

  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);

  const [selectedAttendee, setSelectedAttendee] =
    useState<ReportAttendee | null>(null);

  const [attendanceRecords, setAttendanceRecords] =
    useState<AttendanceRecord[]>([]);

  const [managementLoading, setManagementLoading] =
    useState(false);

  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [
    deletingAttendanceId,
    setDeletingAttendanceId,
  ] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false);

  /* Mobile dropdown states */
  const [
    expandedAttendeeId,
    setExpandedAttendeeId,
  ] = useState<string | null>(null);

  const [
    mobileOverviewOpen,
    setMobileOverviewOpen,
  ] = useState(false);

  const [page, setPage] = useState(0);

  /* =======================================================
     Edit form
  ======================================================= */

  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    church: "",
    location: "",
    gender: "",
    membership_status: "",
  });

  /* =======================================================
     Filters
  ======================================================= */

  const [search, setSearch] = useState("");

  const [debouncedSearch, setDebouncedSearch] =
    useState("");

  const [churchFilter, setChurchFilter] =
    useState("");

  const [locationFilter, setLocationFilter] =
    useState("");

  const [genderFilter, setGenderFilter] =
    useState("");

  const [membershipFilter, setMembershipFilter] =
    useState("");

  /* =======================================================
     Search debounce
  ======================================================= */

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  /* =======================================================
     Load report
  ======================================================= */

  const loadReport = useCallback(
    async (
      requestedPage = 0,
      append = false
    ) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      setError("");

      const params = {
        p_limit: PAGE_SIZE,
        p_offset: requestedPage * PAGE_SIZE,
        p_search: debouncedSearch.trim(),
        p_church: churchFilter.trim() || null,
        p_location: locationFilter.trim() || null,
        p_gender: genderFilter.trim() || null,
        p_membership_status:
          membershipFilter.trim() || null,
      };

      const [
        reportResult,
        countResult,
        serviceAttendanceResult,
      ] = await Promise.all([
        supabase.rpc(
          "get_attendance_report_page",
          params
        ),

        supabase.rpc(
          "get_attendance_report_count",
          {
            p_search: params.p_search,
            p_church: params.p_church,
            p_location: params.p_location,
            p_gender: params.p_gender,
            p_membership_status:
              params.p_membership_status,
          }
        ),

        supabase.rpc(
          "get_attendee_service_attendance_report"
        ),
      ]);

      if (reportResult.error) {
        console.error(
          "get_attendance_report_page:",
          reportResult.error
        );

        setError(reportResult.error.message);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (countResult.error) {
        console.error(
          "get_attendance_report_count:",
          countResult.error
        );

        setError(countResult.error.message);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (serviceAttendanceResult.error) {
        console.error(
          "get_attendee_service_attendance_report:",
          serviceAttendanceResult.error
        );

        setError(
          serviceAttendanceResult.error.message
        );
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const reportRows =
        (reportResult.data ||
          []) as ReportAttendee[];

      const serviceRows =
        (serviceAttendanceResult.data ||
          []) as Array<{
          attendee_id: string;
          services_attended: number;
          total_services: number;
          service_attendance_percentage: number;
        }>;

      const serviceMap = new Map(
        serviceRows.map((row) => [
          row.attendee_id,
          row,
        ])
      );

      const rows = reportRows.map(
        (attendee) => {
          const serviceAttendance =
            serviceMap.get(
              attendee.attendee_id
            );

          return {
            ...attendee,

            services_attended:
              Number(
                serviceAttendance
                  ?.services_attended ?? 0
              ),

            total_services:
              Number(
                serviceAttendance
                  ?.total_services ?? 0
              ),

            service_attendance_percentage:
              Number(
                serviceAttendance
                  ?.service_attendance_percentage ??
                  0
              ),

            attendance_percentage:
              Number(
                serviceAttendance
                  ?.service_attendance_percentage ??
                  0
              ),
          };
        }
      );

      const count = Number(
        countResult.data || 0
      );

      setTotalCount(count);

      if (append) {
        setAttendees((current) => [
          ...current,
          ...rows,
        ]);
      } else {
        setAttendees(rows);
      }

      setPage(requestedPage);

      setExpandedAttendeeId(null);

      setLoading(false);
      setLoadingMore(false);
    },
    [
      debouncedSearch,
      churchFilter,
      locationFilter,
      genderFilter,
      membershipFilter,
    ]
  );

  /* =======================================================
     Initial load + admin role
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const loadRole = async () => {
      const {
        data: sessionData,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!sessionData.session) {
        setIsAdmin(false);
        return;
      }

      const {
        data: role,
        error: roleError,
      } = await supabase.rpc("get_my_role");

      if (!mounted) return;

      if (roleError) {
        console.error(
          "Unable to determine current user role:",
          roleError
        );

        setIsAdmin(false);
        return;
      }

      setIsAdmin(
        String(role)
          .trim()
          .toLowerCase() === "admin"
      );
    };

    loadRole();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(() => {
      loadRole();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  /* =======================================================
     Load first page whenever filters change
  ======================================================= */

  useEffect(() => {
    loadReport(0, false);
  }, [
    debouncedSearch,
    churchFilter,
    locationFilter,
    genderFilter,
    membershipFilter,
    loadReport,
  ]);

  /* =======================================================
     Load more
  ======================================================= */

  async function handleLoadMore() {
    if (loadingMore) return;

    if (attendees.length >= totalCount) {
      return;
    }

    await loadReport(page + 1, true);
  }

  /* =======================================================
     Admin: open edit
  ======================================================= */

  function openEdit(
    attendee: ReportAttendee
  ) {
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
      membership_status:
        attendee.membership_status || "",
    });

    setAttendanceRecords([]);

    setManagementLoading(true);

    supabase
      .rpc("admin_get_attendee_attendance", {
        p_attendee_id:
          attendee.attendee_id,
      })
      .then(({ data, error: rpcError }) => {
        if (rpcError) {
          setError(rpcError.message);
        } else {
          setAttendanceRecords(
            (data ||
              []) as AttendanceRecord[]
          );
        }

        setManagementLoading(false);
      });
  }

  function openEditAndDelete(
    attendee: ReportAttendee
  ) {
    openEdit(attendee);
    setShowDeleteConfirm(true);
  }

  function closeEdit() {
    if (
      savingEdit ||
      deletingId ||
      deletingAttendanceId
    ) {
      return;
    }

    setSelectedAttendee(null);

    setAttendanceRecords([]);

    setShowDeleteConfirm(false);
  }

  /* =======================================================
     Admin: save attendee
  ======================================================= */

  async function saveAttendee() {
    if (!selectedAttendee) return;

    setSavingEdit(true);

    setError("");

    setSuccess("");

    const {
      data,
      error: rpcError,
    } = await supabase.rpc(
      "admin_update_attendee",
      {
        p_attendee_id:
          selectedAttendee.attendee_id,
        p_full_name: editForm.full_name,
        p_phone:
          editForm.phone || null,
        p_church:
          editForm.church || null,
        p_location:
          editForm.location || null,
        p_gender:
          editForm.gender || null,
        p_membership_status:
          editForm.membership_status ||
          null,
      }
    );

    if (rpcError) {
      setError(rpcError.message);

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
      membership_status:
        | MembershipStatus
        | null;
    };

    setAttendees((current) =>
      current.map((item) =>
        item.attendee_id === updated.id
          ? {
              ...item,
              full_name:
                updated.full_name,
              phone: updated.phone,
              church: updated.church,
              location:
                updated.location,
              gender: updated.gender,
              membership_status:
                updated.membership_status,
            }
          : item
      )
    );

    setSelectedAttendee((current) =>
      current
        ? {
            ...current,
            full_name:
              updated.full_name,
            phone: updated.phone,
            church: updated.church,
            location:
              updated.location,
            gender: updated.gender,
            membership_status:
              updated.membership_status,
          }
        : current
    );

    setSuccess(
      "Attendee details updated successfully."
    );

    setSavingEdit(false);
  }

  /* =======================================================
     Admin: delete attendance
  ======================================================= */

  async function deleteAttendance(
    attendanceId: string
  ) {
    if (!selectedAttendee) return;

    const confirmed = window.confirm(
      "Remove this attendance record? This cannot be undone."
    );

    if (!confirmed) return;

    setDeletingAttendanceId(
      attendanceId
    );

    setError("");

    setSuccess("");

    const {
      error: rpcError,
    } = await supabase.rpc(
      "admin_delete_attendance",
      {
        p_attendance_id: attendanceId,
      }
    );

    if (rpcError) {
      setError(rpcError.message);

      setDeletingAttendanceId(null);

      return;
    }

    setAttendanceRecords((current) =>
      current.filter(
        (record) =>
          record.attendance_id !==
          attendanceId
      )
    );

    setSuccess(
      "Attendance record removed."
    );

    setDeletingAttendanceId(null);

    await loadReport(page, false);
  }

  /* =======================================================
     Admin: delete attendee
  ======================================================= */

  async function deleteAttendee() {
    if (!selectedAttendee) return;

    setDeletingId(
      selectedAttendee.attendee_id
    );

    setError("");

    setSuccess("");

    const deletedName =
      selectedAttendee.full_name;

    const deletedId =
      selectedAttendee.attendee_id;

    const {
      error: rpcError,
    } = await supabase.rpc(
      "admin_delete_attendee",
      {
        p_attendee_id: deletedId,
      }
    );

    if (rpcError) {
      setError(rpcError.message);

      setDeletingId(null);

      return;
    }

    setAttendees((current) =>
      current.filter(
        (item) =>
          item.attendee_id !==
          deletedId
      )
    );

    setTotalCount((current) =>
      Math.max(0, current - 1)
    );

    setSuccess(
      `${deletedName} was permanently deleted.`
    );

    setDeletingId(null);

    closeEdit();
  }

  /* =======================================================
     Filter options from loaded data
  ======================================================= */

  const churches = useMemo(
    () =>
      Array.from(
        new Set(
          attendees
            .map((a) => a.church)
            .filter(
              (
                church
              ): church is string =>
                Boolean(church)
            )
        )
      ).sort(),
    [attendees]
  );

  const locations = useMemo(
    () =>
      Array.from(
        new Set(
          attendees
            .map((a) => a.location)
            .filter(
              (
                location
              ): location is string =>
                Boolean(location)
            )
        )
      ).sort(),
    [attendees]
  );

  /* =======================================================
     Statistics
  ======================================================= */

  const stats = useMemo(() => {
    const registered = totalCount;

    const male = attendees.filter(
      (a) => a.gender === "male"
    ).length;

    const female = attendees.filter(
      (a) => a.gender === "female"
    ).length;

    const members = attendees.filter(
      (a) =>
        a.membership_status === "member"
    ).length;

    const visitors = attendees.filter(
      (a) =>
        a.membership_status === "visitor"
    ).length;

    const totalCheckIns =
      attendees.reduce(
        (total, attendee) =>
          total +
          Number(
            attendee.days_attended || 0
          ),
        0
      );

    const fullAttendance =
      attendees.filter(
        (attendee) =>
          Number(
            attendee.days_attended
          ) === EVENT_DAY_COUNT
      ).length;

    const partialAttendance =
      attendees.filter((attendee) => {
        const days = Number(
          attendee.days_attended
        );

        return days > 0 && days < EVENT_DAY_COUNT;
      }).length;

    const averageAttendance =
      attendees.length > 0
        ? attendees.reduce(
            (total, attendee) =>
              total +
              Number(
                attendee.attendance_percentage ||
                  0
              ),
            0
          ) / attendees.length
        : 0;

    return {
      registered,
      male,
      female,
      members,
      visitors,
      totalCheckIns,
      fullAttendance,
      partialAttendance,
      averageAttendance,
    };
  }, [attendees, totalCount]);

  /* =======================================================
     CSV Export
  ======================================================= */

  function exportCSV() {
    if (!attendees.length) return;

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
      "Day 6",
      "Days Attended",
      "Attendance %",
    ];

    const rows = attendees.map(
      (attendee) => [
        attendee.registration_number,
        attendee.full_name,
        attendee.phone || "",
        formatGender(attendee.gender),
        formatMembership(
          attendee.membership_status
        ),
        attendee.church || "",
        attendee.location || "",
        attendee.day_1 || "",
        attendee.day_2 || "",
        attendee.day_3 || "",
        attendee.day_4 || "",
        attendee.day_5 || "",
        attendee.day_6 || "",
        Number(
          attendee.days_attended || 0
        ),
        Number(
          attendee.attendance_percentage ||
            0
        ),
      ]
    );

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => {
            const text = String(
              value ?? ""
            );

            return `"${text.replace(
              /"/g,
              '""'
            )}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "attendance-report.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /* =======================================================
     Filter state
  ======================================================= */

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
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

  const hasMore =
    attendees.length < totalCount;

  /* =======================================================
     Render
  ======================================================= */

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-50 text-slate-900">
        {/* =================================================
            Header
        ================================================== */}

        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-purple-600 text-base font-black text-white shadow-sm">
                F
              </div>

              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.15em] text-fuchsia-600">
                  Fountain of Victory Church
                </p>

                <p className="mt-0.5 truncate text-base font-black text-slate-900 sm:text-lg">
                  Attendance Reports
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/"
                className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-fuchsia-200 hover:bg-fuchsia-50 hover:text-fuchsia-700 sm:inline-flex"
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
          {/* =================================================
              Hero
          ================================================== */}

          <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-700 via-purple-700 to-blue-700 shadow-sm">
            <div className="relative px-5 py-7 sm:px-7 sm:py-8">
              <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

              <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />

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
                    Registration, demographics and
                    6-day service attendance in one
                    place.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      loadReport(0, false)
                    }
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        loading
                          ? "animate-spin"
                          : ""
                      }`}
                    />

                    {loading
                      ? "Refreshing..."
                      : "Refresh"}
                  </button>

                  <button
                    type="button"
                    onClick={exportCSV}
                    disabled={!attendees.length}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-fuchsia-700 shadow-sm transition hover:bg-fuchsia-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Export Loaded CSV
                  </button>

                  {isAdmin && (
                    <Link
                      href="/reports/stats"
                      className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-white/25"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Stats
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              Alerts
          ================================================== */}

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-200 text-[11px] font-black text-red-800">
                !
              </div>

              <div className="min-w-0">
                <div className="font-bold">
                  Unable to complete request
                </div>

                <div className="mt-1 break-words">
                  {error}
                </div>
              </div>
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

          {/* =================================================
              Summary
          ================================================== */}

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SummaryMetric
              label="Registered"
              value={stats.registered}
              description="All matching attendees"
              accent="fuchsia"
              icon={
                <Users className="h-5 w-5" />
              }
            />

            <SummaryMetric
              label="Members"
              value={stats.members}
              description="Loaded records"
              accent="emerald"
              icon={
                <UserCheck className="h-5 w-5" />
              }
            />

            <SummaryMetric
              label="Visitors"
              value={stats.visitors}
              description="Loaded records"
              accent="amber"
              icon={
                <Users className="h-5 w-5" />
              }
            />

            <SummaryMetric
              label="Male"
              value={stats.male}
              description="Loaded records"
              accent="blue"
              icon={
                <UserRound className="h-5 w-5" />
              }
            />

            <SummaryMetric
              label="Female"
              value={stats.female}
              description="Loaded records"
              accent="purple"
              icon={
                <UserRound className="h-5 w-5" />
              }
            />

            <SummaryMetric
              label="Avg. Attendance"
              value={`${stats.averageAttendance.toFixed(
                1
              )}%`}
              description="Loaded records"
              accent="fuchsia"
              icon={
                <BarChart3 className="h-5 w-5" />
              }
            />
          </section>

          {/* =================================================
              Attendance Overview
          ================================================== */}

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Mobile dropdown header */}
            <button
              type="button"
              onClick={() =>
                setMobileOverviewOpen(
                  (current) => !current
                )
              }
              aria-expanded={
                mobileOverviewOpen
              }
              className="flex w-full items-center justify-between gap-4 p-5 text-left md:hidden"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <CalendarDays className="h-[18px] w-[18px]" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-black text-slate-900">
                    Attendance Overview
                  </h2>

                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    Attendance summary
                  </p>
                </div>
              </div>

              <ChevronDown
                className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
                  mobileOverviewOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {/* Desktop header */}
            <div className="hidden p-5 sm:p-6 md:block">
              <SectionHeader
                icon={
                  <CalendarDays className="h-[18px] w-[18px]" />
                }
                title="Attendance Overview"
                subtitle="Attendance from the records currently loaded."
                accent="blue"
                right={
                  <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    Server paginated
                  </div>
                }
              />
            </div>

            {/* Overview body */}
            <div
              className={`${
                mobileOverviewOpen
                  ? "block border-t border-slate-100"
                  : "hidden"
              } p-5 sm:p-6 md:block`}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-fuchsia-600">
                    Total attended days
                  </div>

                  <div className="mt-2 text-2xl font-black leading-none text-slate-900">
                    {stats.totalCheckIns}
                  </div>

                  <div className="mt-2 text-[11px] font-medium text-slate-400">
                    Currently loaded records
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                    Full attendance
                  </div>

                  <div className="mt-2 text-2xl font-black leading-none text-slate-900">
                    {stats.fullAttendance}
                  </div>

                  <div className="mt-2 text-[11px] font-medium text-slate-400">
                    Loaded records with all 6
                    days
                  </div>
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-amber-600">
                    Partial attendance
                  </div>

                  <div className="mt-2 text-2xl font-black leading-none text-slate-900">
                    {stats.partialAttendance}
                  </div>

                  <div className="mt-2 text-[11px] font-medium text-slate-400">
                    Loaded records with 1–4
                    days
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              Filters
          ================================================== */}

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader
              icon={
                <Filter className="h-4 w-4" />
              }
              title="Filters"
              subtitle="Search and filter directly in the database."
              right={
                hasFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1.5 self-start rounded-lg px-3 py-2 text-xs font-bold text-fuchsia-600 transition hover:bg-fuchsia-50 sm:self-auto"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear filters
                  </button>
                ) : null
              }
            />

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
              {/* Search */}
              <div className="lg:col-span-4">
                <label className={labelClass}>
                  Search
                </label>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fuchsia-400" />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Name, registration number or phone"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              {/* Church */}
              <div className="lg:col-span-2">
                <label className={labelClass}>
                  Church
                </label>

                <select
                  value={churchFilter}
                  onChange={(event) =>
                    setChurchFilter(
                      event.target.value
                    )
                  }
                  className={`${inputClass} text-slate-700`}
                >
                  <option value="">
                    All churches
                  </option>

                  {churches.map((church) => (
                    <option
                      key={church}
                      value={church}
                    >
                      {church}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="lg:col-span-2">
                <label className={labelClass}>
                  Location
                </label>

                <select
                  value={locationFilter}
                  onChange={(event) =>
                    setLocationFilter(
                      event.target.value
                    )
                  }
                  className={`${inputClass} text-slate-700`}
                >
                  <option value="">
                    All locations
                  </option>

                  {locations.map(
                    (location) => (
                      <option
                        key={location}
                        value={location}
                      >
                        {location}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Gender */}
              <div className="lg:col-span-2">
                <label className={labelClass}>
                  Gender
                </label>

                <select
                  value={genderFilter}
                  onChange={(event) =>
                    setGenderFilter(
                      event.target.value
                    )
                  }
                  className={`${inputClass} text-slate-700`}
                >
                  <option value="">
                    All genders
                  </option>

                  <option value="male">
                    Male
                  </option>

                  <option value="female">
                    Female
                  </option>
                </select>
              </div>

              {/* Membership */}
              <div className="lg:col-span-2">
                <label className={labelClass}>
                  Type
                </label>

                <select
                  value={membershipFilter}
                  onChange={(event) =>
                    setMembershipFilter(
                      event.target.value
                    )
                  }
                  className={`${inputClass} text-slate-700`}
                >
                  <option value="">
                    All types
                  </option>

                  <option value="member">
                    Members
                  </option>

                  <option value="visitor">
                    Visitors
                  </option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex flex-col justify-between gap-2 border-t border-slate-100 pt-4 text-xs sm:flex-row sm:items-center">
              <p className="font-medium text-slate-500">
                Showing{" "}
                <span className="font-black text-slate-900">
                  {attendees.length}
                </span>{" "}
                of{" "}
                <span className="font-black text-slate-900">
                  {totalCount}
                </span>{" "}
                matching attendees
              </p>

              {hasFilters && (
                <p className="font-semibold text-fuchsia-600">
                  Filters active
                </p>
              )}
            </div>
          </section>

          {/* =================================================
              Loading
          ================================================== */}

          {loading && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-50">
                <RefreshCw className="h-5 w-5 animate-spin text-fuchsia-600" />
              </span>

              <div className="mt-4 text-sm font-bold text-slate-700">
                Loading attendance report...
              </div>

              <p className="mt-1 text-xs font-medium text-slate-400">
                Loading attendance data.
              </p>
            </div>
          )}

          {/* =================================================
              Empty
          ================================================== */}

          {!loading &&
            !error &&
            totalCount === 0 && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <Users className="h-6 w-6" />
                </div>

                <div className="mt-4 text-lg font-bold text-slate-900">
                  No attendees found
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Try changing or clearing your
                  filters.
                </p>
              </div>
            )}

          {/* =================================================
              Mobile attendee list
          ================================================== */}

          {!loading &&
            attendees.length > 0 && (
              <div className="mt-6 md:hidden">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Attendees
                  </p>

                  <p className="text-[11px] font-semibold text-slate-400">
                    Tap for full details
                  </p>
                </div>

                <div className="space-y-3">
                  {attendees.map(
                    (attendee) => (
                      <MobileAttendeeCard
                        key={
                          attendee.attendee_id
                        }
                        attendee={attendee}
                        isAdmin={isAdmin}
                        open={
                          expandedAttendeeId ===
                          attendee.attendee_id
                        }
                        onToggle={() =>
                          setExpandedAttendeeId(
                            (current) =>
                              current ===
                              attendee.attendee_id
                                ? null
                                : attendee.attendee_id
                          )
                        }
                        onEdit={openEdit}
                        onDelete={
                          openEditAndDelete
                        }
                      />
                    )
                  )}
                </div>

                {hasMore && (
                  <button
                    type="button"
                    onClick={
                      handleLoadMore
                    }
                    disabled={loadingMore}
                    className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-black text-fuchsia-700 shadow-sm transition hover:bg-fuchsia-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingMore
                      ? "Loading..."
                      : `Load more (${
                          totalCount -
                          attendees.length
                        } remaining)`}
                  </button>
                )}
              </div>
            )}

          {/* =================================================
              Desktop table
          ================================================== */}

          {!loading &&
            attendees.length > 0 && (
              <section className="mt-6 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                <div className="border-b border-slate-100 bg-gradient-to-r from-fuchsia-50/60 to-blue-50/60 px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        Attendee attendance
                      </p>

                      <p className="mt-1 text-xs font-medium text-slate-500">
                        Detailed registration,
                        demographic and service
                        attendance records.
                      </p>
                    </div>

                    <div className="hidden items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 shadow-sm sm:flex">
                      <UserRoundCheck className="h-3.5 w-3.5 text-emerald-500" />

                      {attendees.length} loaded
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1400px] border-separate border-spacing-0 text-left text-sm">
                    <colgroup>
                      <col className="w-[120px]" />
                      <col className="w-[200px]" />
                      <col className="w-[88px]" />
                      <col className="w-[88px]" />
                      <col className="w-[130px]" />
                      <col className="w-[160px]" />
                      <col className="w-[160px]" />

                      <col className="w-[180px]" />
                      <col className="w-[180px]" />
                      <col className="w-[180px]" />
                      <col className="w-[180px]" />
                      <col className="w-[180px]" />
                      <col className="w-[180px]" />

                      <col className="w-[88px]" />
                      <col className="w-[130px]" />

                      {isAdmin && (
                        <col className="w-[160px]" />
                      )}
                    </colgroup>

                    <thead>
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
                          "Day 6",
                        ].map(
                          (heading) => (
                            <th
                              key={heading}
                              className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500"
                            >
                              {heading}
                            </th>
                          )
                        )}

                        <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-[10px] font-black uppercase tracking-wide text-slate-500">
                          Services
                        </th>

                        <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-[10px] font-black uppercase tracking-wide text-slate-500">
                          Attendance
                        </th>

                        {isAdmin && (
                          <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {attendees.map(
                        (
                          attendee,
                          index
                        ) => (
                          <DesktopRow
                            key={
                              attendee.attendee_id
                            }
                            attendee={
                              attendee
                            }
                            index={index}
                            isAdmin={
                              isAdmin
                            }
                            onEdit={
                              openEdit
                            }
                            onDelete={
                              openEditAndDelete
                            }
                          />
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {hasMore && (
                  <div className="border-t border-slate-200 bg-slate-50 p-4 text-center">
                    <button
                      type="button"
                      onClick={
                        handleLoadMore
                      }
                      disabled={
                        loadingMore
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black text-fuchsia-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-fuchsia-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Load more (
                          {totalCount -
                            attendees.length}{" "}
                          remaining)
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs font-medium text-slate-500">
                  Each day shows the service or
                  services attended. Multiple
                  services on the same day count as
                  one attended day.
                  {isAdmin &&
                    " Admin controls are available for editing or removing records."}
                </div>
              </section>
            )}
        </div>

        {/* =================================================
            Admin Modal
        ================================================== */}

        {isAdmin && selectedAttendee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm sm:p-6">
            <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
              {/* Modal header */}
              <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-600">
                      <UserRoundCog className="h-3.5 w-3.5" />
                      Admin management
                    </div>

                    <h2 className="mt-1 truncate text-lg font-black text-slate-950">
                      {
                        selectedAttendee.full_name
                      }
                    </h2>

                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                      #
                      {
                        selectedAttendee.registration_number
                      }
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
                {managementLoading && !showDeleteConfirm ? (
                  <div className="rounded-2xl bg-slate-50 p-8 text-center">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin text-fuchsia-600" />

                    <p className="mt-3 text-sm font-bold text-slate-700">
                      Loading attendance
                      records...
                    </p>
                  </div>
                ) : (
                  <>
                    {!showDeleteConfirm && (
                      <>
                        {/* Personal details */}
                        <section>
                          <div className="mb-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-600">
                              Personal details
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Update the attendee&apos;s
                              registration information.
                            </p>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            {[
                              [
                                "full_name",
                                "Full name",
                                "Enter full name",
                              ],
                              [
                                "phone",
                                "Phone",
                                "Phone number",
                              ],
                              [
                                "church",
                                "Church",
                                "Church name",
                              ],
                              [
                                "location",
                                "Location",
                                "Location",
                              ],
                            ].map(
                              ([
                                key,
                                label,
                                placeholder,
                              ]) => (
                                <div key={key}>
                                  <label
                                    className={
                                      labelClass
                                    }
                                  >
                                    {label}
                                  </label>

                                  <input
                                    type="text"
                                    value={
                                      editForm[
                                        key as keyof typeof editForm
                                      ]
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      setEditForm(
                                        (
                                          current
                                        ) => ({
                                          ...current,
                                          [key]:
                                            event
                                              .target
                                              .value,
                                        })
                                      )
                                    }
                                    placeholder={
                                      placeholder
                                    }
                                    className={
                                      inputClass
                                    }
                                  />
                                </div>
                              )
                            )}

                            <div>
                              <label
                                className={
                                  labelClass
                                }
                              >
                                Gender
                              </label>

                              <select
                                value={
                                  editForm.gender
                                }
                                onChange={(event) =>
                                  setEditForm(
                                    (
                                      current
                                    ) => ({
                                      ...current,
                                      gender:
                                        event
                                          .target
                                          .value,
                                    })
                                  )
                                }
                                className={
                                  inputClass
                                }
                              >
                                <option value="">
                                  Not set
                                </option>

                                <option value="male">
                                  Male
                                </option>

                                <option value="female">
                                  Female
                                </option>
                              </select>
                            </div>

                            <div>
                              <label
                                className={
                                  labelClass
                                }
                              >
                                Member or Visitor
                              </label>

                              <select
                                value={
                                  editForm.membership_status
                                }
                                onChange={(
                                  event
                                ) =>
                                  setEditForm(
                                    (
                                      current
                                    ) => ({
                                      ...current,
                                      membership_status:
                                        event
                                          .target
                                          .value,
                                    })
                                  )
                                }
                                className={
                                  inputClass
                                }
                              >
                                <option value="">
                                  Not set
                                </option>

                                <option value="member">
                                  Member
                                </option>

                                <option value="visitor">
                                  Visitor
                                </option>
                              </select>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={
                              saveAttendee
                            }
                            disabled={
                              savingEdit
                            }
                            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-700 via-purple-700 to-blue-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                          >
                            {savingEdit ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}

                            {savingEdit
                              ? "Saving changes..."
                              : "Save changes"}
                          </button>
                        </section>

                        {/* Attendance records */}
                        <section className="border-t border-slate-100 pt-6">
                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">
                                Attendance records
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Remove an accidental
                                check-in without
                                deleting the attendee.
                              </p>
                            </div>

                            <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                              {
                                attendanceRecords.length
                              }{" "}
                              record
                              {attendanceRecords.length ===
                              1
                                ? ""
                                : "s"}
                            </span>
                          </div>

                          <div className="mt-4 space-y-2">
                            {attendanceRecords.length ===
                            0 ? (
                              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-medium text-slate-400">
                                No attendance
                                records.
                              </div>
                            ) : (
                              attendanceRecords.map(
                                (record) => (
                                  <div
                                    key={
                                      record.attendance_id
                                    }
                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-xs font-black text-slate-800">
                                        Day{" "}
                                        {
                                          record.event_day
                                        }{" "}
                                        ·{" "}
                                        {
                                          record.service_name
                                        }
                                        {formatServiceTime(
                                          record
                                        )}
                                      </p>

                                      <p className="mt-1 text-[10px] font-medium text-slate-400">
                                        Checked in{" "}
                                        {formatAttendanceDate(
                                          record.attended_at
                                        )}
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        deleteAttendance(
                                          record.attendance_id
                                        )
                                      }
                                      disabled={
                                        deletingAttendanceId ===
                                        record.attendance_id
                                      }
                                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 text-[10px] font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                                    >
                                      {deletingAttendanceId ===
                                      record.attendance_id ? (
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}

                                      Remove
                                    </button>
                                  </div>
                                )
                              )
                            )}
                          </div>
                        </section>
                      </>
                    )}

                    {/* Delete attendee */}
                    <section className="border-t border-red-100 pt-6">
                      <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-black text-red-900">
                              Delete attendee
                              permanently
                            </p>

                            <p className="mt-1 text-xs leading-5 text-red-800/70">
                              This removes the
                              attendee and all
                              attendance records.
                              This cannot be
                              undone.
                            </p>
                          </div>
                        </div>

                        {showDeleteConfirm ? (
                          <div className="mt-4 rounded-xl border border-red-200 bg-white p-3">
                            <p className="text-xs font-bold text-slate-700">
                              Delete{" "}
                              {
                                selectedAttendee.full_name
                              }{" "}
                              permanently?
                            </p>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setShowDeleteConfirm(
                                    false
                                  )
                                }
                                disabled={
                                  deletingId !==
                                  null
                                }
                                className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-600"
                              >
                                Cancel
                              </button>

                              <button
                                type="button"
                                onClick={
                                  deleteAttendee
                                }
                                disabled={
                                  deletingId !==
                                  null
                                }
                                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-black text-white disabled:opacity-50"
                              >
                                {deletingId ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}

                                {deletingId
                                  ? "Deleting..."
                                  : "Yes, delete"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setShowDeleteConfirm(
                                true
                              )
                            }
                            className="mt-4 w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-xs font-black text-red-700 transition hover:bg-red-100"
                          >
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

        {/* =================================================
            Footer
        ================================================== */}

        <footer className="mt-10 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 text-center text-[11px] font-medium text-slate-400 sm:px-6 lg:px-8">
            Fountain of Victory Church · Attendance
            Management System
          </div>
        </footer>
      </main>
    </AuthGuard>
  );
}


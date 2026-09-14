"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  MapPin,
  Phone,
  Search,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/lib/supabase";

type Gender = "male" | "female";
type MembershipStatus = "member" | "visitor";

type Attendee = {
  id: string;
  registration_number: string;
  full_name: string;
  phone_last4: string | null;
  church: string | null;
  location: string | null;
  gender: Gender | null;
  membership_status: MembershipStatus | null;
};

type EventService = {
  id: string;
  day_id: string;
  day_number: number;
  service_name: string;
  start_time: string | null;
  end_time: string | null;
  description: string | null;
  is_active: boolean;
};

type AttendanceHistoryItem = {
  event_day: number;
  attended_at: string;
  service_name: string | null;
  start_time: string | null;
  end_time: string | null;
};

function formatTime(value: string | null) {
  if (!value) return "";

  const [hours, minutes] = value.split(":");
  const hour = Number(hours);

  if (Number.isNaN(hour)) return value;

  const suffix = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 || 12;

  return `${formattedHour}:${minutes} ${suffix}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatGender(gender: Gender | null) {
  if (!gender) return null;
  return gender === "male" ? "Male" : "Female";
}

function formatMembership(status: MembershipStatus | null) {
  if (!status) return null;
  return status === "member" ? "Member" : "Visitor";
}

function GenderBadge({ gender }: { gender: Gender | null }) {
  if (!gender) return null;

  return (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
      {formatGender(gender)}
    </span>
  );
}

function MembershipBadge({
  status,
}: {
  status: MembershipStatus | null;
}) {
  if (!status) return null;

  const isMember = status === "member";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
        isMember
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {formatMembership(status)}
    </span>
  );
}

function PersonDetail({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
        {icon}
      </span>

      <span className="truncate">{children}</span>
    </div>
  );
}

function ServiceCard({
  service,
  selected,
  attended,
  onSelect,
}: {
  service: EventService;
  selected: boolean;
  attended: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={attended}
      className={`w-full rounded-xl border p-4 text-left transition ${
        attended
          ? "cursor-default border-emerald-200 bg-emerald-50"
          : selected
          ? "border-fuchsia-500 bg-fuchsia-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-fuchsia-200 hover:bg-fuchsia-50/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`text-sm font-bold ${
                attended
                  ? "text-emerald-800"
                  : selected
                  ? "text-fuchsia-800"
                  : "text-slate-900"
              }`}
            >
              {service.service_name}
            </p>

            {attended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                <Check className="h-3 w-3" />
                Attended
              </span>
            )}
          </div>

          {(service.start_time || service.end_time) && (
            <div
              className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${
                attended
                  ? "text-emerald-700"
                  : selected
                  ? "text-fuchsia-700"
                  : "text-slate-500"
              }`}
            >
              <Clock3 className="h-3.5 w-3.5" />

              <span>
                {formatTime(service.start_time)}
                {service.end_time
                  ? ` – ${formatTime(service.end_time)}`
                  : ""}
              </span>
            </div>
          )}

          {service.description && (
            <p
              className={`mt-2 text-xs leading-5 ${
                attended
                  ? "text-emerald-700"
                  : selected
                  ? "text-fuchsia-700"
                  : "text-slate-500"
              }`}
            >
              {service.description}
            </p>
          )}
        </div>

        {!attended && (
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
              selected
                ? "border-fuchsia-300 bg-fuchsia-600 text-white"
                : "border-slate-200 bg-slate-50 text-slate-300"
            }`}
          >
            {selected && <Check className="h-4 w-4" />}
          </div>
        )}
      </div>
    </button>
  );
}

function AttendanceHistory({
  history,
}: {
  history: AttendanceHistoryItem[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-500">
          No attendance history found.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-slate-50"
      >
        <div>
          <p className="text-sm font-bold text-slate-900">
            Attendance history
          </p>

          <p className="mt-1 text-xs font-medium text-slate-500">
            {history.length} attendance record
            {history.length === 1 ? "" : "s"}
          </p>
        </div>

        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-slate-100">
          {history.map((item, index) => (
            <div
              key={`${item.event_day}-${item.attended_at}-${index}`}
              className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  Day {item.event_day}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {item.service_name || "General attendance"}
                </p>

                {(item.start_time || item.end_time) && (
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    {formatTime(item.start_time)}
                    {item.end_time
                      ? ` – ${formatTime(item.end_time)}`
                      : ""}
                  </p>
                )}
              </div>

              <p className="shrink-0 text-right text-[11px] font-semibold text-slate-400">
                {formatDateTime(item.attended_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CheckInPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [selectedAttendee, setSelectedAttendee] =
    useState<Attendee | null>(null);

  const [currentEventDay, setCurrentEventDay] = useState<number | null>(
    null
  );

  const [services, setServices] = useState<EventService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const [selectedService, setSelectedService] =
    useState<EventService | null>(null);

  const [attendanceHistory, setAttendanceHistory] = useState<
    AttendanceHistoryItem[]
  >([]);

  const [loadingHistory, setLoadingHistory] = useState(false);

  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState("");
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [successTime, setSuccessTime] = useState<string | null>(null);

  const loadCurrentEventDay = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_current_event_day");

    if (error) {
      console.error("Failed to load current event day:", error);
      return;
    }

    setCurrentEventDay(Number(data));
  }, []);

  const loadServices = useCallback(async () => {
    setLoadingServices(true);

    const { data, error } = await supabase.rpc("get_event_schedule");

    if (error) {
      console.error("Failed to load event schedule:", error);
      setServices([]);
      setLoadingServices(false);
      return;
    }

    const rows = (data || []) as Array<{
      day_id: string;
      day_number: number;
      service_id: string | null;
      service_name: string | null;
      start_time: string | null;
      end_time: string | null;
      description: string | null;
      is_active: boolean | null;
    }>;

    const mappedServices: EventService[] = rows
      .filter(
        (row) =>
          row.service_id &&
          row.service_name &&
          row.is_active === true
      )
      .map((row) => ({
        id: row.service_id as string,
        day_id: row.day_id,
        day_number: Number(row.day_number),
        service_name: row.service_name as string,
        start_time: row.start_time,
        end_time: row.end_time,
        description: row.description,
        is_active: true,
      }));

    setServices(mappedServices);
    setLoadingServices(false);
  }, []);

  const loadAttendanceHistory = useCallback(
    async (attendeeId: string) => {
      setLoadingHistory(true);

      const { data, error } = await supabase.rpc(
        "get_attendee_attendance_history",
        {
          p_attendee_id: attendeeId,
        }
      );

      if (error) {
        console.error("Failed to load attendance history:", error);
        setAttendanceHistory([]);
        setLoadingHistory(false);
        return;
      }

      setAttendanceHistory(
        (data || []) as AttendanceHistoryItem[]
      );

      setLoadingHistory(false);
    },
    []
  );

  useEffect(() => {
    loadCurrentEventDay();
    loadServices();
  }, [loadCurrentEventDay, loadServices]);

  useEffect(() => {
    const value = searchQuery.trim();

    if (!value) {
      setAttendees([]);
      setSearchError("");
      setSearching(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");

      const { data, error } = await supabase.rpc(
        "search_attendees",
        {
          p_query: value,
        }
      );

      if (error) {
        console.error("Search failed:", error);
        setSearchError("Unable to search attendees.");
        setAttendees([]);
        setSearching(false);
        return;
      }

      setAttendees((data || []) as Attendee[]);
      setSearching(false);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const currentDayServices = useMemo(() => {
    if (!currentEventDay) return [];

    return services
      .filter(
        (service) =>
          service.day_number === currentEventDay &&
          service.is_active
      )
      .sort((a, b) => {
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return a.start_time.localeCompare(b.start_time);
      });
  }, [services, currentEventDay]);

  const selectAttendee = async (attendee: Attendee) => {
    setSelectedAttendee(attendee);
    setSearchQuery("");
    setAttendees([]);
    setSearchError("");
    setSelectedService(null);
    setCheckInError("");
    setCheckInSuccess(false);
    setSuccessTime(null);

    await loadAttendanceHistory(attendee.id);
  };

  const resetSelection = () => {
    setSelectedAttendee(null);
    setSelectedService(null);
    setAttendanceHistory([]);
    setSearchQuery("");
    setAttendees([]);
    setCheckInError("");
    setCheckInSuccess(false);
    setSuccessTime(null);
  };

  const handleCheckIn = async () => {
    if (!selectedAttendee) {
      setCheckInError("Please select an attendee.");
      return;
    }

    if (!currentEventDay) {
      setCheckInError("The current event day could not be determined.");
      return;
    }

    if (!selectedService) {
      setCheckInError("Please select a service.");
      return;
    }

    setCheckingIn(true);
    setCheckInError("");

    const { data, error } = await supabase.rpc("check_in_attendee", {
      p_attendee_id: selectedAttendee.id,
      p_event_day: currentEventDay,
      p_station_id: "check-in",
      p_event_service_id: selectedService.id,
    });

    if (error) {
      console.error("Check-in failed:", error);
      setCheckInError(
        error.message || "Unable to complete check-in."
      );
      setCheckingIn(false);
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (result?.status === "already_attended") {
      setCheckInError(
        "This attendee has already checked in for this service."
      );
      setCheckingIn(false);
      await loadAttendanceHistory(selectedAttendee.id);
      return;
    }

    setSuccessTime(result?.attended_at || new Date().toISOString());
    setCheckInSuccess(true);
    setCheckingIn(false);

    await loadAttendanceHistory(selectedAttendee.id);
  };

  /*
   * SUCCESS SCREEN
   */
  if (checkInSuccess && selectedAttendee && selectedService) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:py-8">
        <div className="mx-auto w-full max-w-xl">
          {/* Back to dashboard */}
          <div className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-fuchsia-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-fuchsia-700 via-purple-700 to-blue-700 px-6 py-8 text-center text-white sm:px-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20">
                <Check className="h-8 w-8" />
              </div>

              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-fuchsia-100">
                Check-in successful
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight">
                Welcome, {selectedAttendee.full_name}
              </h1>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/80">
                You have been checked in for{" "}
                <span className="font-bold text-white">
                  {selectedService.service_name}
                </span>
                .
              </p>

              {successTime && (
                <p className="mt-3 text-xs font-medium text-white/60">
                  {formatDateTime(successTime)}
                </p>
              )}
            </div>

            <div className="p-5 sm:p-6">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                      Day {currentEventDay}
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {selectedService.service_name}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={resetSelection}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-5 text-sm font-bold text-white transition hover:bg-fuchsia-700 active:scale-[0.99]"
              >
                <ArrowLeft className="h-4 w-4" />
                Check in another attendee
              </button>

              <Link
                href="/"
                className="mt-2 flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Return to dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * MAIN CHECK-IN PAGE
   */
  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 sm:px-4 sm:py-6">
      <div className="mx-auto w-full max-w-xl">
        {/* Header */}
        <header className="mb-5">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-fuchsia-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>

            <span className="rounded-full bg-fuchsia-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide text-fuchsia-700">
              Check-in
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-purple-600 text-base font-bold text-white shadow-sm">
              F
            </div>

            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.15em] text-fuchsia-600">
                Fountain of Victory Church
              </p>

              <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">
                Attendee check-in
              </h1>
            </div>
          </div>
        </header>

        {/* Search */}
        {!selectedAttendee && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-600">
                Find attendee
              </p>

              <h2 className="mt-1 text-base font-bold text-slate-900">
                Search for an attendee
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Search by name, registration number, phone, church or location.
              </p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fuchsia-400" />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search attendee..."
                className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-fuchsia-300 focus:bg-white focus:ring-2 focus:ring-fuchsia-100"
              />
            </div>

            {searching && (
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-fuchsia-100 border-t-fuchsia-600" />
                Searching...
              </div>
            )}

            {searchError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {searchError}
              </div>
            )}

            {!searching &&
              searchQuery.trim() &&
              attendees.length === 0 &&
              !searchError && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                  <Users className="mx-auto h-6 w-6 text-slate-300" />

                  <p className="mt-2 text-sm font-bold text-slate-700">
                    No attendees found
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-400">
                    Try another name or registration number.
                  </p>
                </div>
              )}

            {/* Search results */}
            {attendees.length > 0 && (
              <div className="mt-4 space-y-2">
                {attendees.map((attendee) => (
                  <div
                    key={attendee.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-fuchsia-200 hover:bg-fuchsia-50/20"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-600">
                        <Users className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {attendee.full_name}
                              </p>

                              {/* Member / Visitor + Gender */}
                              <MembershipBadge
                                status={attendee.membership_status}
                              />

                              <GenderBadge
                                gender={attendee.gender}
                              />
                            </div>

                            <p className="mt-1 text-[11px] font-semibold text-slate-500">
                              #{attendee.registration_number}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => selectAttendee(attendee)}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-fuchsia-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-fuchsia-700 active:scale-[0.98]"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Select
                          </button>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {attendee.phone_last4 && (
                            <PersonDetail
                              icon={<Phone className="h-3.5 w-3.5" />}
                            >
                              {attendee.phone_last4}
                            </PersonDetail>
                          )}

                          {attendee.church && (
                            <PersonDetail
                              icon={<Users className="h-3.5 w-3.5" />}
                            >
                              {attendee.church}
                            </PersonDetail>
                          )}

                          {attendee.location && (
                            <PersonDetail
                              icon={<MapPin className="h-3.5 w-3.5" />}
                            >
                              {attendee.location}
                            </PersonDetail>
                          )}

                          {formatGender(attendee.gender) && (
                            <PersonDetail
                              icon={<User className="h-3.5 w-3.5" />}
                            >
                              {formatGender(attendee.gender)}
                            </PersonDetail>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Selected attendee */}
        {selectedAttendee && (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <User className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-bold text-slate-900">
                        {selectedAttendee.full_name}
                      </h2>

                      {/* Member / Visitor + Gender */}
                      <MembershipBadge
                        status={selectedAttendee.membership_status}
                      />

                      <GenderBadge
                        gender={selectedAttendee.gender}
                      />
                    </div>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      #{selectedAttendee.registration_number}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetSelection}
                  className="shrink-0 rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-xs font-bold text-fuchsia-700 transition hover:bg-fuchsia-100"
                >
                  Change
                </button>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {selectedAttendee.phone_last4 && (
                  <PersonDetail
                    icon={<Phone className="h-3.5 w-3.5" />}
                  >
                    {selectedAttendee.phone_last4}
                  </PersonDetail>
                )}

                {selectedAttendee.church && (
                  <PersonDetail
                    icon={<Users className="h-3.5 w-3.5" />}
                  >
                    {selectedAttendee.church}
                  </PersonDetail>
                )}

                {selectedAttendee.location && (
                  <PersonDetail
                    icon={<MapPin className="h-3.5 w-3.5" />}
                  >
                    {selectedAttendee.location}
                  </PersonDetail>
                )}

                {formatGender(selectedAttendee.gender) && (
                  <PersonDetail
                    icon={<User className="h-3.5 w-3.5" />}
                  >
                    {formatGender(selectedAttendee.gender)}
                  </PersonDetail>
                )}
              </div>
            </section>

            {/* Service selection */}
            <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-600">
                      Event service
                    </p>

                    <h3 className="mt-1 text-base font-bold text-slate-900">
                      Select service
                    </h3>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Choose the service this attendee is attending.
                    </p>
                  </div>

                  {currentEventDay && (
                    <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                      Day {currentEventDay}
                    </span>
                  )}
                </div>
              </div>

              {loadingServices ? (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-slate-500">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-fuchsia-100 border-t-fuchsia-600" />
                  Loading services...
                </div>
              ) : currentDayServices.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                  <CalendarDays className="mx-auto h-6 w-6 text-fuchsia-300" />

                  <p className="mt-2 text-sm font-bold text-slate-700">
                    No active services
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-400">
                    There are currently no active services for today.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentDayServices.map((service) => {
                    const attended = attendanceHistory.some(
                      (item) =>
                        item.service_name === service.service_name &&
                        item.event_day === currentEventDay
                    );

                    return (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        selected={selectedService?.id === service.id}
                        attended={attended}
                        onSelect={() => {
                          if (!attended) {
                            setSelectedService(service);
                            setCheckInError("");
                          }
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {checkInError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {checkInError}
                </div>
              )}

              <button
                type="button"
                onClick={handleCheckIn}
                disabled={
                  checkingIn ||
                  !selectedService ||
                  currentDayServices.length === 0
                }
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {checkingIn ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Checking in...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Check in attendee
                  </>
                )}
              </button>
            </section>

            {/* Attendance history */}
            <section className="mt-4">
              {loadingHistory ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-fuchsia-100 border-t-fuchsia-600" />
                    Loading attendance history...
                  </div>
                </div>
              ) : (
                <AttendanceHistory history={attendanceHistory} />
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
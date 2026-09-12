"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";

type Attendee = {
  id: string;
  registration_number: string;
  full_name: string;
  phone_last4: string | null;
  church: string | null;
  location: string | null;
};

type CheckInResult = {
  status: "checked_in" | "already_attended";
  attended_at: string;
};

type AttendanceRecord = {
  event_day: number;
  attended_at: string;
};

export default function CheckInPage() {
  const [query, setQuery] = useState("");
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [selectedAttendee, setSelectedAttendee] =
    useState<Attendee | null>(null);

  const [currentEventDay, setCurrentEventDay] = useState<number | null>(null);
  const [loadingEventDay, setLoadingEventDay] = useState(true);

  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const [error, setError] = useState("");
  const [checkInResult, setCheckInResult] =
    useState<CheckInResult | null>(null);

  const [attendanceHistory, setAttendanceHistory] = useState<
    AttendanceRecord[]
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    async function loadEventDay() {
      const { data, error } = await supabase.rpc("get_current_event_day");

      setLoadingEventDay(false);

      if (error) {
        console.error("Event day error:", error);
        setError("Unable to load the current event day.");
        return;
      }

      setCurrentEventDay(data);
    }

    loadEventDay();
  }, []);

  async function loadAttendanceHistory(attendeeId: string) {
    setLoadingHistory(true);

    const { data, error } = await supabase.rpc(
      "get_attendee_attendance_history",
      {
        p_attendee_id: attendeeId,
      }
    );

    setLoadingHistory(false);

    if (error) {
      console.error("Attendance history error:", error);
      setAttendanceHistory([]);
      return;
    }

    setAttendanceHistory(data ?? []);
  }

  async function handleSearch() {
    const search = query.trim();

    setSelectedAttendee(null);
    setCheckInResult(null);
    setAttendanceHistory([]);

    if (!search) {
      setAttendees([]);
      setError("Enter a name, phone number, or registration number.");
      return;
    }

    setLoading(true);
    setError("");

    const { data, error } = await supabase.rpc("search_attendees", {
      p_query: search,
    });

    setLoading(false);

    if (error) {
      console.error("Search error:", error);
      setAttendees([]);
      setError("Unable to search attendees. Please try again.");
      return;
    }

    setAttendees(data ?? []);

    if (!data || data.length === 0) {
      setError("No attendee found.");
    }
  }

  async function handleSelect(attendee: Attendee) {
    setSelectedAttendee(attendee);
    setCheckInResult(null);
    setError("");
    setAttendanceHistory([]);

    await loadAttendanceHistory(attendee.id);
  }

  async function handleCheckIn() {
    if (!selectedAttendee) {
      return;
    }

    if (!currentEventDay) {
      setError("The current event day has not loaded yet.");
      return;
    }

    setCheckingIn(true);
    setError("");
    setCheckInResult(null);

    const { data, error } = await supabase.rpc("check_in_attendee", {
      p_attendee_id: selectedAttendee.id,
      p_event_day: currentEventDay,
      p_station_id: "MAIN-ENTRANCE",
    });

    setCheckingIn(false);

    if (error) {
      console.error("Check-in error:", error);
      setError("Unable to check in attendee. Please try again.");
      return;
    }

    const result = data?.[0];

    if (!result) {
      setError("No check-in result was returned.");
      return;
    }

    setCheckInResult({
      status: result.status,
      attended_at: result.attended_at,
    });

    await loadAttendanceHistory(selectedAttendee.id);
  }

  function formatTime(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatDateTime(timestamp: string) {
    return new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getAttendanceForDay(day: number) {
    return attendanceHistory.find(
      (attendance) => attendance.event_day === day
    );
  }

  function handleStartNewSearch() {
    setQuery("");
    setAttendees([]);
    setSelectedAttendee(null);
    setCheckInResult(null);
    setAttendanceHistory([]);
    setError("");
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-50 text-slate-900">
        {/* Brand header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-700 via-purple-700 to-blue-700 text-sm font-black text-white shadow-sm">
                <span className="relative z-10">FV</span>
                <div className="absolute -right-2 -top-2 h-6 w-6 rounded-full border-2 border-amber-300/70" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-700 sm:text-xs">
                  Fountain of Victory Church
                </p>

                <p className="truncate text-xs text-slate-500">
                  Attendance & Registration
                </p>
              </div>
            </Link>

            <Link
              href="/"
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:px-4 sm:text-sm"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <div className="mx-auto w-full max-w-5xl px-3 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-6">
          {/* Hero */}
          <section className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-800 via-purple-700 to-blue-700 p-5 text-white shadow-lg sm:p-7">
            {/* Decorative orbit */}
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[18px] border-white/10" />
            <div className="pointer-events-none absolute -right-5 -top-10 h-36 w-36 rounded-full border-2 border-amber-300/30" />
            <div className="pointer-events-none absolute bottom-[-80px] left-[-50px] h-48 w-48 rounded-full border-[14px] border-white/5" />

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/90 sm:text-xs">
                    <span className="h-2 w-2 rounded-full bg-amber-300" />
                    Entrance Desk
                  </div>

                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                    Check in attendee
                  </h1>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                    Search for an attendee and record their attendance for
                    today&apos;s event day.
                  </p>
                </div>

                <div className="hidden shrink-0 sm:block">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl font-black shadow-inner">
                    ✓
                  </div>
                </div>
              </div>

              {/* Event day */}
              <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/55">
                    Current event day
                  </p>

                  <p className="mt-0.5 text-sm font-bold sm:text-base">
                    {loadingEventDay
                      ? "Loading event day..."
                      : `Day ${currentEventDay}`}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300 text-sm font-black text-slate-900 shadow-sm">
                  {loadingEventDay ? "..." : currentEventDay}
                </div>
              </div>
            </div>
          </section>

          {/* Success / Already attended */}
          {checkInResult && selectedAttendee && (
            <section
              className={`mb-5 overflow-hidden rounded-3xl border shadow-sm ${
                checkInResult.status === "checked_in"
                  ? "border-emerald-200 bg-white"
                  : "border-amber-200 bg-white"
              }`}
            >
              <div
                className={`px-5 py-4 sm:px-6 ${
                  checkInResult.status === "checked_in"
                    ? "bg-emerald-50"
                    : "bg-amber-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl font-black ${
                      checkInResult.status === "checked_in"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {checkInResult.status === "checked_in" ? "✓" : "!"}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold uppercase tracking-wide ${
                        checkInResult.status === "checked_in"
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {checkInResult.status === "checked_in"
                        ? "Attendance recorded"
                        : "Already recorded"}
                    </p>

                    <h2 className="mt-1 break-words text-lg font-black text-slate-950 sm:text-xl">
                      {selectedAttendee.full_name}
                    </h2>

                    <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                      {checkInResult.status === "checked_in"
                        ? "Successfully checked in at"
                        : "First attendance was recorded at"}{" "}
                      <span className="font-bold">
                        {formatTime(checkInResult.attended_at)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <button
                  type="button"
                  onClick={handleStartNewSearch}
                  className="min-h-12 w-full rounded-xl bg-gradient-to-r from-fuchsia-700 to-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:from-fuchsia-800 hover:to-blue-800 active:scale-[0.99]"
                >
                  Check in another attendee
                </button>
              </div>
            </section>
          )}

          {/* Selected attendee */}
          {selectedAttendee && (
            <section className="mb-5 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
              {/* Selected header */}
              <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-black text-blue-700">
                      {selectedAttendee.full_name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                        Selected attendee
                      </p>

                      <h2 className="mt-0.5 break-words text-lg font-black leading-tight text-slate-950 sm:text-xl">
                        {selectedAttendee.full_name}
                      </h2>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 sm:text-xs">
                    {selectedAttendee.registration_number}
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {/* Details */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Church
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                      {selectedAttendee.church || "Not provided"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Location
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                      {selectedAttendee.location || "Not provided"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Phone
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {selectedAttendee.phone_last4 || "Not provided"}
                    </p>
                  </div>
                </div>

                {/* Attendance history */}
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-950">
                        Attendance history
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Attendance across all event days
                      </p>
                    </div>

                    {!loadingHistory && (
                      <span className="rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-bold text-fuchsia-700">
                        {attendanceHistory.length}/5 attended
                      </span>
                    )}
                  </div>

                  {loadingHistory ? (
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
                      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
                        ...
                      </div>
                      Loading attendance history...
                    </div>
                  ) : (
                    <>
                      {/* Mobile history */}
                      <div className="space-y-2 sm:hidden">
                        {[1, 2, 3, 4, 5].map((day) => {
                          const attendance = getAttendanceForDay(day);
                          const isCurrentDay = currentEventDay === day;

                          return (
                            <div
                              key={day}
                              className={`flex min-h-14 items-center justify-between rounded-2xl border px-3 py-2.5 ${
                                isCurrentDay
                                  ? "border-blue-200 bg-blue-50"
                                  : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${
                                    attendance
                                      ? "bg-emerald-100 text-emerald-700"
                                      : isCurrentDay
                                        ? "bg-blue-100 text-blue-600"
                                        : "bg-slate-200 text-slate-400"
                                  }`}
                                >
                                  {attendance ? "✓" : "—"}
                                </div>

                                <div>
                                  <p
                                    className={`text-sm font-bold ${
                                      isCurrentDay
                                        ? "text-blue-700"
                                        : "text-slate-700"
                                    }`}
                                  >
                                    Day {day}
                                  </p>

                                  {isCurrentDay && (
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-blue-500">
                                      Today
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                {attendance ? (
                                  <>
                                    <p className="text-xs font-bold text-emerald-700">
                                      Attended
                                    </p>

                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                      {formatTime(attendance.attended_at)}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-xs font-medium text-slate-400">
                                    Not attended
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop history */}
                      <div className="hidden grid-cols-5 gap-2 sm:grid">
                        {[1, 2, 3, 4, 5].map((day) => {
                          const attendance = getAttendanceForDay(day);
                          const isCurrentDay = currentEventDay === day;

                          return (
                            <div
                              key={day}
                              className={`rounded-2xl border p-3 text-center ${
                                isCurrentDay
                                  ? "border-blue-200 bg-blue-50"
                                  : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <p
                                className={`text-xs font-black ${
                                  isCurrentDay
                                    ? "text-blue-700"
                                    : "text-slate-600"
                                }`}
                              >
                                Day {day}
                              </p>

                              {isCurrentDay && (
                                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-500">
                                  Today
                                </p>
                              )}

                              <div
                                className={`mx-auto mt-3 flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${
                                  attendance
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-200 text-slate-400"
                                }`}
                              >
                                {attendance ? "✓" : "—"}
                              </div>

                              <p className="mt-2 text-[10px] leading-3 text-slate-500">
                                {attendance
                                  ? formatTime(attendance.attended_at)
                                  : "Not yet"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {!loadingHistory && attendanceHistory.length > 0 && (
                    <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm text-amber-700">
                          ★
                        </div>

                        <div>
                          <p className="text-xs font-bold text-amber-900">
                            Latest attendance
                          </p>

                          <p className="mt-1 text-xs leading-5 text-amber-800/75">
                            Day{" "}
                            {
                              attendanceHistory[
                                attendanceHistory.length - 1
                              ].event_day
                            }{" "}
                            ·{" "}
                            {formatDateTime(
                              attendanceHistory[
                                attendanceHistory.length - 1
                              ].attended_at
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Check-in action */}
                {!checkInResult && (
                  <>
                    <button
                      type="button"
                      onClick={handleCheckIn}
                      disabled={checkingIn || !currentEventDay}
                      className="mt-6 min-h-14 w-full rounded-2xl bg-gradient-to-r from-fuchsia-700 via-purple-700 to-blue-700 px-4 py-3 text-base font-black text-white shadow-md transition hover:from-fuchsia-800 hover:via-purple-800 hover:to-blue-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {checkingIn
                        ? "Checking in..."
                        : !currentEventDay
                          ? "Loading event day..."
                          : `Check in ${selectedAttendee.full_name}`}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAttendee(null);
                        setCheckInResult(null);
                        setAttendanceHistory([]);
                      }}
                      className="mt-2 min-h-11 w-full rounded-xl px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100 active:bg-slate-100"
                    >
                      Choose a different attendee
                    </button>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Search */}
          {!checkInResult && (
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-black text-blue-600">
                  ⌕
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-950 sm:text-lg">
                    Find an attendee
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                    Search by name, phone number, or registration number.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  placeholder="Name, phone, or REG-000001"
                  className="min-h-13 min-w-0 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium outline-none transition placeholder:text-slate-400 focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-50 sm:flex-1"
                />

                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={loading}
                  className="min-h-13 w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {loading ? "Searching..." : "Search attendee"}
                </button>
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2.5">
                <span className="text-sm text-blue-600">ⓘ</span>

                <p className="text-xs leading-5 text-slate-600">
                  For duplicate names, confirm the church and location before
                  selecting the attendee.
                </p>
              </div>

              {error && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-medium leading-5 text-amber-800">
                  {error}
                </div>
              )}
            </section>
          )}

          {/* Search results */}
          {attendees.length > 0 &&
            !selectedAttendee &&
            !checkInResult && (
              <section className="mt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-600">
                      Matching attendees
                    </p>

                    <h2 className="mt-0.5 text-lg font-black text-slate-950">
                      Search results
                    </h2>
                  </div>

                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {attendees.length} found
                  </span>
                </div>

                <div className="space-y-3">
                  {attendees.map((attendee) => (
                    <button
                      key={attendee.id}
                      type="button"
                      onClick={() => handleSelect(attendee)}
                      className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md active:scale-[0.99] sm:p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-100 to-blue-100 text-sm font-black text-blue-700">
                          {attendee.full_name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="break-words text-sm font-black text-slate-950 sm:text-base">
                            {attendee.full_name}
                          </h3>

                          <p className="mt-1 text-xs font-bold text-blue-600 sm:text-sm">
                            {attendee.registration_number}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1.5 text-[10px] font-black text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white sm:px-3 sm:text-xs">
                          Select
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 sm:grid-cols-3 sm:text-sm">
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                            Church
                          </p>

                          <p className="mt-0.5 break-words font-medium">
                            {attendee.church || "Not provided"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                            Location
                          </p>

                          <p className="mt-0.5 break-words font-medium">
                            {attendee.location || "Not provided"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                            Phone
                          </p>

                          <p className="mt-0.5 font-medium">
                            {attendee.phone_last4 || "Not provided"}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

          {/* Register link */}
          {!selectedAttendee && !checkInResult && (
            <section className="mt-5 overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">
              <div className="flex items-start gap-4 bg-gradient-to-r from-sky-50 via-white to-fuchsia-50 p-4 sm:p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-fuchsia-100 text-xl font-black text-fuchsia-700">
                  +
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-slate-950 sm:text-base">
                    Can&apos;t find the attendee?
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                    Register them first, then return here to check them in.
                  </p>

                  <Link
                    href="/register"
                    className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-fuchsia-50 px-3.5 py-2 text-xs font-black text-fuchsia-700 transition hover:bg-fuchsia-100 sm:text-sm"
                  >
                    Register new attendee
                    <span className="ml-1.5">→</span>
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Footer branding */}
          <footer className="mt-8 pb-4 text-center">
            <div className="mx-auto mb-3 h-px w-20 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-blue-500" />

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Fountain of Victory Church
            </p>

            <p className="mt-1 text-[10px] text-slate-400">
              The Pillar and Ground of Truth
            </p>
          </footer>
        </div>
      </main>
    </AuthGuard>
  );
}
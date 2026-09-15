
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type EventService = {
  id: string;
  event_day_id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  description: string | null;
  is_active: boolean;
};

type EventDay = {
  id: string;
  day_number: number;
  day_name: string;
  event_date: string | null;
  services: EventService[];
};

type DashboardStats = {
  registered: number;
  today: number;
  new_today: number;
  checked_in: number;
};

const allActions = [
  {
    title: "Check in attendee",
    description: "Search and record attendance.",
    icon: "✓",
    href: "/check-in",
    roles: ["admin", "event_staff"],
    accent: "blue",
  },
  {
    title: "Register attendee",
    description: "Create a new attendee record.",
    icon: "+",
    href: "/register",
    roles: ["admin", "event_staff"],
    accent: "purple",
  },
  {
    title: "View reports",
    description: "Attendance and registration data.",
    icon: "▥",
    href: "/reports",
    roles: ["admin", "reports"],
    accent: "gold",
  },
  {
    title: "Manage users",
    description: "Manage staff accounts and access.",
    icon: "♙",
    href: "/admin/users",
    roles: ["admin"],
    accent: "dark",
  },
];

export default function HomePage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [role, setRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    registered: 0,
    today: 0,
    new_today: 0,
    checked_in: 0,
  });

  const [loadingStats, setLoadingStats] = useState(true);

  const [eventDays, setEventDays] = useState<EventDay[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleMessage, setScheduleMessage] = useState("");

  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const [currentEventDay, setCurrentEventDay] = useState<number | null>(null);
  const [loadingCurrentDay, setLoadingCurrentDay] = useState(true);
  const [settingCurrentDay, setSettingCurrentDay] = useState(false);

  const [addingService, setAddingService] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [serviceStartTime, setServiceStartTime] = useState("");
  const [serviceEndTime, setServiceEndTime] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [savingService, setSavingService] = useState(false);

  const [editingServiceId, setEditingServiceId] = useState<string | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [updatingService, setUpdatingService] = useState(false);

  const isAdmin = role === "admin";
  const isEventStaff = role === "event_staff";

  const selectedDay = useMemo(
    () => eventDays.find((day) => day.id === selectedDayId) ?? null,
    [eventDays, selectedDayId]
  );

  const activeServices =
    selectedDay?.services.filter((service) => service.is_active) ?? [];

  const currentDay = useMemo(
    () =>
      eventDays.find((day) => day.day_number === currentEventDay) ?? null,
    [eventDays, currentEventDay]
  );

  const currentDayServices =
    currentDay?.services.filter((service) => service.is_active) ?? [];

  const actions = allActions.filter((action) =>
    action.roles.includes(role ?? "")
  );

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        window.location.href = "/login";
        return;
      }

      setAuthenticated(true);
      setCheckingAuth(false);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        window.location.href = "/login";
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    async function loadDashboard() {
      setLoadingRole(true);
      setLoadingStats(true);

      const [roleResult, statsResult] = await Promise.all([
        supabase.rpc("get_my_role"),
        supabase.rpc("get_dashboard_stats"),
      ]);

      if (roleResult.error) {
        console.error("Role error:", roleResult.error);
        setRole(null);
      } else {
        setRole(roleResult.data ?? null);
      }

      if (statsResult.error) {
        console.error("Dashboard stats error:", statsResult.error);
      } else if (statsResult.data) {
        const stats = Array.isArray(statsResult.data)
          ? statsResult.data[0]
          : statsResult.data;

        if (stats) {
          setDashboardStats({
            registered: Number(stats.registered ?? 0),
            today: Number(stats.today ?? 0),
            new_today: Number(stats.new_today ?? 0),
            checked_in: Number(stats.checked_in ?? 0),
          });
        }
      }

      setLoadingRole(false);
      setLoadingStats(false);
    }

    loadDashboard();
    loadSchedule();
    loadCurrentEventDay();
  }, [authenticated]);

  async function loadCurrentEventDay() {
    setLoadingCurrentDay(true);

    const { data, error } = await supabase.rpc("get_current_event_day");

    if (error) {
      console.error("Current event day error:", error);
      setLoadingCurrentDay(false);
      return;
    }

    setCurrentEventDay(Number(data));
    setLoadingCurrentDay(false);
  }

  async function loadSchedule() {
    setLoadingSchedule(true);
    setScheduleError("");

    const { data, error } = await supabase.rpc("get_event_schedule");

    if (error) {
      console.error("Schedule error:", error);
      setScheduleError(error.message);
      setLoadingSchedule(false);
      return;
    }

    const rows = (data ?? []) as Array<{
      day_id: string;
      day_number: number;
      day_name: string;
      event_date: string | null;
      service_id: string | null;
      service_name: string | null;
      start_time: string | null;
      end_time: string | null;
      description: string | null;
      is_active: boolean | null;
    }>;

    const grouped = new Map<string, EventDay>();

    rows.forEach((row) => {
      if (!grouped.has(row.day_id)) {
        grouped.set(row.day_id, {
          id: row.day_id,
          day_number: row.day_number,
          day_name: row.day_name,
          event_date: row.event_date,
          services: [],
        });
      }

      if (row.service_id) {
        grouped.get(row.day_id)?.services.push({
          id: row.service_id,
          event_day_id: row.day_id,
          name: row.service_name ?? "",
          start_time: row.start_time,
          end_time: row.end_time,
          description: row.description,
          is_active: row.is_active ?? true,
        });
      }
    });

    const days = Array.from(grouped.values()).sort(
      (a, b) => a.day_number - b.day_number
    );

    setEventDays(days);

    if (!selectedDayId && days.length > 0) {
      setSelectedDayId(days[0].id);
    } else if (
      selectedDayId &&
      !days.some((day) => day.id === selectedDayId)
    ) {
      setSelectedDayId(days[0]?.id ?? null);
    }

    setLoadingSchedule(false);
  }

  async function handleSetCurrentDay(dayNumber: number) {
    if (!isAdmin) return;

    if (currentEventDay === dayNumber) return;

    const day = eventDays.find((item) => item.day_number === dayNumber);

    const confirmed = window.confirm(
      `Set Day ${dayNumber} as the current check-in day?\n\n` +
        `The Check-in page will now use Day ${dayNumber}'s active services.`
    );

    if (!confirmed) return;

    setSettingCurrentDay(true);
    setScheduleError("");
    setScheduleMessage("");

    const { data, error } = await supabase.rpc("set_current_event_day", {
      p_event_day: dayNumber,
    });

    if (error) {
      console.error("Set current event day error:", error);
      setScheduleError(error.message);
      setSettingCurrentDay(false);
      return;
    }

    const newDay = Number(data);

    setCurrentEventDay(newDay);
    setSettingCurrentDay(false);

    setScheduleMessage(
      `${day?.day_name ?? `Day ${newDay}`} is now the current check-in day.`
    );

    setTimeout(() => setScheduleMessage(""), 4000);
  }

  function resetAddForm() {
    setServiceName("");
    setServiceStartTime("");
    setServiceEndTime("");
    setServiceDescription("");
  }

  function openAddService() {
    if (!isAdmin || !selectedDay) return;

    cancelEditingService();
    resetAddForm();
    setAddingService(true);
    setScheduleError("");
    setScheduleMessage("");
  }

  function cancelAddService() {
    setAddingService(false);
    resetAddForm();
  }

  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault();

    if (!isAdmin || !selectedDay) return;

    if (!serviceName.trim()) {
      setScheduleError("Please enter a service name.");
      return;
    }

    if (
      serviceStartTime &&
      serviceEndTime &&
      serviceEndTime <= serviceStartTime
    ) {
      setScheduleError("End time must be later than start time.");
      return;
    }

    setSavingService(true);
    setScheduleError("");
    setScheduleMessage("");

    const { error } = await supabase.rpc("create_event_service", {
      p_event_day_id: selectedDay.id,
      p_name: serviceName.trim(),
      p_start_time: serviceStartTime || null,
      p_end_time: serviceEndTime || null,
      p_description: serviceDescription.trim() || null,
    });

    if (error) {
      console.error(error);
      setScheduleError(error.message);
      setSavingService(false);
      return;
    }

    const createdName = serviceName.trim();

    setSavingService(false);
    setAddingService(false);
    resetAddForm();

    setScheduleMessage(
      `"${createdName}" was added to ${selectedDay.day_name}.`
    );

    await loadSchedule();

    setTimeout(() => setScheduleMessage(""), 3500);
  }

  function startEditingService(service: EventService) {
    setAddingService(false);
    setEditingServiceId(service.id);

    setEditName(service.name);
    setEditStartTime(formatTimeForInput(service.start_time));
    setEditEndTime(formatTimeForInput(service.end_time));
    setEditDescription(service.description ?? "");

    setScheduleError("");
    setScheduleMessage("");
  }

  function cancelEditingService() {
    setEditingServiceId(null);
    setEditName("");
    setEditStartTime("");
    setEditEndTime("");
    setEditDescription("");
  }

  async function handleUpdateService(e: React.FormEvent) {
    e.preventDefault();

    if (!isAdmin || !editingServiceId) return;

    if (!editName.trim()) {
      setScheduleError("Please enter a service name.");
      return;
    }

    if (
      editStartTime &&
      editEndTime &&
      editEndTime <= editStartTime
    ) {
      setScheduleError("End time must be later than start time.");
      return;
    }

    setUpdatingService(true);
    setScheduleError("");
    setScheduleMessage("");

    const service = selectedDay?.services.find(
      (item) => item.id === editingServiceId
    );

    const { error } = await supabase.rpc("update_event_service", {
      p_service_id: editingServiceId,
      p_name: editName.trim(),
      p_start_time: editStartTime || null,
      p_end_time: editEndTime || null,
      p_description: editDescription.trim() || null,
      p_is_active: service?.is_active ?? true,
    });

    if (error) {
      console.error(error);
      setScheduleError(error.message);
      setUpdatingService(false);
      return;
    }

    setUpdatingService(false);
    cancelEditingService();

    setScheduleMessage("Service updated successfully.");

    await loadSchedule();

    setTimeout(() => setScheduleMessage(""), 3500);
  }

  async function handleRemoveService(service: EventService) {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `"${service.name}" will be removed from the active schedule.\n\nThe service record and all attendance data will remain preserved in the database and historical reports.\n\nContinue?`
    );

    if (!confirmed) return;

    setScheduleError("");
    setScheduleMessage("");

    const { error } = await supabase.rpc("delete_event_service", {
      p_service_id: service.id,
    });

    if (error) {
      console.error(error);
      setScheduleError(error.message);
      return;
    }

    if (editingServiceId === service.id) {
      cancelEditingService();
    }

    setScheduleMessage(
      `"${service.name}" was removed from the active schedule.`
    );

    await loadSchedule();

    setTimeout(() => setScheduleMessage(""), 4000);
  }

  function formatTime(time: string | null) {
    if (!time) return "";

    const [hourString, minute] = time.split(":");
    const hour = Number(hourString);

    if (Number.isNaN(hour)) return time;

    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minute} ${suffix}`;
  }

  function formatTimeForInput(time: string | null) {
    if (!time) return "";
    return time.substring(0, 5);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function getRoleLabel() {
    if (role === "admin") return "Administrator";
    if (role === "event_staff") return "Event Staff";
    if (role === "reports") return "Reports";
    return "";
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-fuchsia-200 border-t-fuchsia-600" />
          <p className="text-sm font-medium text-slate-500">
            Loading dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!authenticated) return null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[62px] max-w-7xl items-center justify-between gap-3 px-3 sm:min-h-[68px] sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-600 to-purple-600 text-base font-bold text-white sm:h-10 sm:w-10 sm:rounded-xl sm:text-lg">
              F
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-xs font-bold text-slate-900 sm:text-base">
                Fountain of Victory Church
              </h1>

              <p className="truncate text-[10px] text-slate-500 sm:text-xs">
                Event attendance dashboard
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!loadingRole && getRoleLabel() && (
              <span className="hidden rounded-full bg-fuchsia-50 px-3 py-1.5 text-xs font-semibold text-fuchsia-700 md:block">
                {getRoleLabel()}
              </span>
            )}

            <button
              onClick={handleSignOut}
              className="rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 sm:px-3 sm:text-xs"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        {/* Welcome */}
        <section className="mb-5 rounded-xl bg-gradient-to-r from-fuchsia-700 via-purple-700 to-blue-700 px-4 py-5 text-white shadow-sm sm:mb-6 sm:rounded-2xl sm:px-7 sm:py-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fuchsia-100 sm:text-xs sm:tracking-[0.18em]">
            Attendance management
          </p>

          <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-3xl">
            Welcome to your event dashboard
          </h2>

          <p className="mt-2 max-w-xl text-xs leading-5 text-white/80 sm:text-sm sm:leading-6">
            Manage registrations, services, check-ins and reports from one
            place.
          </p>
        </section>

        {/* Live check-in day */}
        <section className="mb-5 rounded-xl border border-fuchsia-100 bg-white shadow-sm sm:mb-6 sm:rounded-2xl">
          <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-fuchsia-600 sm:text-xs">
                Live check-in
              </p>

              <div className="mt-1 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

                <p className="text-sm font-bold text-slate-900 sm:text-base">
                  {loadingCurrentDay
                    ? "Loading current day..."
                    : currentEventDay
                    ? `Day ${currentEventDay} is active`
                    : "Current day unavailable"}
                </p>
              </div>

              <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">
                This is the day used by the Check-in page.
              </p>
            </div>

            {currentEventDay && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center sm:min-w-[150px]">
                <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-600">
                  Current check-in day
                </p>

                <p className="mt-0.5 text-lg font-bold text-emerald-700">
                  Day {currentEventDay}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Event staff quick actions */}
        {isEventStaff && actions.length > 0 && (
          <section className="mb-5 sm:mb-6">
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-fuchsia-600 sm:text-xs">
                Quick actions
              </p>

              <h3 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
                What would you like to do?
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {actions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group flex min-h-[96px] items-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-fuchsia-300 hover:shadow-md active:scale-[0.99] sm:min-h-[110px] sm:rounded-2xl sm:p-5"
                >
                  <div className="flex w-full items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold ${getActionIconClass(
                        action.accent
                      )} sm:h-14 sm:w-14 sm:text-2xl`}
                    >
                      {action.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-fuchsia-700 sm:text-base">
                        {action.title}
                      </h4>

                      <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                        {action.description}
                      </p>
                    </div>

                    <span className="shrink-0 text-lg font-semibold text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-fuchsia-500">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="mb-5 grid grid-cols-2 gap-2.5 sm:mb-7 sm:gap-3 lg:grid-cols-4">
          <StatCard
            label="Registered"
            value={dashboardStats.registered}
            description="Total attendees"
            loading={loadingStats}
            accent="fuchsia"
          />

          <StatCard
            label="Attendance"
            value={dashboardStats.today}
            description="Attendance today"
            loading={loadingStats}
            accent="blue"
          />

          <StatCard
            label="New today"
            value={dashboardStats.new_today}
            description="New registrations"
            loading={loadingStats}
            accent="purple"
          />

          <StatCard
            label="Checked in"
            value={dashboardStats.checked_in}
            description="Already attended"
            loading={loadingStats}
            accent="gold"
          />
        </section>

        {/* Event staff current day */}
        {isEventStaff && (
          <section className="mb-5 space-y-5 sm:mb-6">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm sm:rounded-2xl">
              <div className="border-b border-slate-200 px-3.5 py-3.5 sm:px-6 sm:py-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-fuchsia-600 sm:text-xs">
                  Today
                </p>

                <h3 className="mt-0.5 text-base font-bold text-slate-900 sm:mt-1 sm:text-lg">
                  Current event day
                </h3>
              </div>

              <div className="p-3.5 sm:p-6">
                {loadingSchedule ? (
                  <div className="py-5 text-center">
                    <p className="text-sm text-slate-500">
                      Loading today&apos;s schedule...
                    </p>
                  </div>
                ) : currentDay ? (
                  <>
                    <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-600">
                        Day {currentDay.day_number}
                      </p>

                      <h4 className="mt-1 text-lg font-bold text-slate-900">
                        {currentDay.day_name}
                      </h4>

                      {currentDay.event_date && (
                        <p className="mt-1 text-xs text-slate-500">
                          {currentDay.event_date}
                        </p>
                      )}
                    </div>

                    {currentDayServices.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold text-slate-600">
                          Today&apos;s active services
                        </p>

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                          {currentDayServices.map((service) => (
                            <div
                              key={service.id}
                              className="rounded-xl border border-slate-200 bg-white p-3.5"
                            >
                              <div className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-800">
                                    {service.name}
                                  </p>

                                  {(service.start_time ||
                                    service.end_time) && (
                                    <p className="mt-1 text-[11px] text-slate-500">
                                      {service.start_time
                                        ? formatTime(service.start_time)
                                        : "No start"}{" "}
                                      –{" "}
                                      {service.end_time
                                        ? formatTime(service.end_time)
                                        : "No end"}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    The current event day is not available.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Schedule */}
        {!isEventStaff && (
          <section className="w-full rounded-xl border border-slate-200 bg-white shadow-sm sm:rounded-2xl">
            <div className="border-b border-slate-200 px-3.5 py-3.5 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-fuchsia-600 sm:text-xs">
                    Event schedule
                  </p>

                  <h3 className="mt-0.5 text-base font-bold text-slate-900 sm:mt-1 sm:text-lg">
                    Services
                  </h3>
                </div>

                {isAdmin && selectedDay && (
                  <button
                    onClick={openAddService}
                    className="shrink-0 rounded-lg bg-fuchsia-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-fuchsia-700 sm:px-4 sm:py-2.5 sm:text-sm"
                  >
                    + Add service
                  </button>
                )}
              </div>
            </div>

            {loadingSchedule ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-fuchsia-100 border-t-fuchsia-600" />
                <p className="text-sm text-slate-500">
                  Loading schedule...
                </p>
              </div>
            ) : scheduleError ? (
              <div className="m-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700 sm:m-4 sm:text-sm">
                {scheduleError}
              </div>
            ) : (
              <>
                <div className="border-b border-slate-200 bg-slate-50/70 px-3 py-2.5 sm:px-5 sm:py-3">
                  <div
                    className="flex gap-1.5 overflow-x-auto pb-1"
                    style={{
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    {eventDays.map((day) => {
                      const isSelected = selectedDayId === day.id;
                      const isCurrent = currentEventDay === day.day_number;

                      return (
                        <button
                          key={day.id}
                          onClick={() => {
                            setSelectedDayId(day.id);
                            setAddingService(false);
                            cancelEditingService();
                            setScheduleError("");
                            setScheduleMessage("");
                          }}
                          className={`relative min-w-[68px] shrink-0 rounded-lg border px-3 py-2 text-center transition sm:min-w-[90px] sm:px-4 ${
                            isSelected
                              ? "border-fuchsia-600 bg-fuchsia-600 text-white shadow-sm"
                              : "border-slate-200 bg-white text-slate-600 hover:border-fuchsia-200 hover:bg-fuchsia-50 hover:text-fuchsia-700"
                          }`}
                        >
                          <span className="block text-[10px] font-bold uppercase tracking-wide sm:text-xs">
                            Day {day.day_number}
                          </span>

                          {isCurrent && (
                            <span
                              className={`mt-1 block text-[8px] font-bold uppercase tracking-wide ${
                                isSelected
                                  ? "text-emerald-100"
                                  : "text-emerald-600"
                              }`}
                            >
                              Live
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedDay && (
                  <div className="p-3.5 sm:p-6">
                    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-blue-700 sm:text-[10px]">
                            Day {selectedDay.day_number}
                          </span>

                          {selectedDay.event_date && (
                            <span className="truncate text-[10px] text-slate-400 sm:text-xs">
                              {selectedDay.event_date}
                            </span>
                          )}
                        </div>

                        <h4 className="mt-1.5 truncate text-base font-bold text-slate-900 sm:mt-2 sm:text-lg">
                          {selectedDay.day_name}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-medium text-slate-400 sm:text-xs">
                          {activeServices.length}{" "}
                          {activeServices.length === 1
                            ? "service"
                            : "services"}
                        </span>

                        {currentEventDay === selectedDay.day_number ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-600">
                            Current check-in day
                          </span>
                        ) : (
                          isAdmin && (
                            <button
                              onClick={() =>
                                handleSetCurrentDay(selectedDay.day_number)
                              }
                              disabled={settingCurrentDay}
                              className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-[10px] font-bold text-fuchsia-700 transition hover:bg-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
                            >
                              {settingCurrentDay
                                ? "Updating..."
                                : `Set Day ${selectedDay.day_number} for check-in`}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {scheduleMessage && (
                      <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700 sm:px-4 sm:py-3 sm:text-sm">
                        {scheduleMessage}
                      </div>
                    )}

                    {scheduleError && (
                      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700 sm:px-4 sm:py-3 sm:text-sm">
                        {scheduleError}
                      </div>
                    )}

                    {isAdmin && addingService && (
                      <form
                        onSubmit={handleCreateService}
                        className="mb-5 rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 p-3.5 sm:p-5"
                      >
                        <div className="mb-4">
                          <h5 className="text-sm font-bold text-slate-900">
                            Add service
                          </h5>

                          <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-xs">
                            Add a service to {selectedDay.day_name}. Multiple
                            services may run at the same time.
                          </p>
                        </div>

                        <div className="space-y-3.5 sm:space-y-4">
                          <Field label="Service name" required>
                            <input
                              value={serviceName}
                              onChange={(e) => setServiceName(e.target.value)}
                              placeholder="Morning Service"
                              className="input"
                              autoFocus
                            />
                          </Field>

                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Start time">
                              <input
                                type="time"
                                value={serviceStartTime}
                                onChange={(e) =>
                                  setServiceStartTime(e.target.value)
                                }
                                className="input"
                              />
                            </Field>

                            <Field label="End time">
                              <input
                                type="time"
                                value={serviceEndTime}
                                onChange={(e) =>
                                  setServiceEndTime(e.target.value)
                                }
                                className="input"
                              />
                            </Field>
                          </div>

                          <Field label="Description">
                            <input
                              value={serviceDescription}
                              onChange={(e) =>
                                setServiceDescription(e.target.value)
                              }
                              placeholder="Optional description"
                              className="input"
                            />
                          </Field>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={cancelAddService}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:text-sm"
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            disabled={savingService}
                            className="rounded-lg bg-fuchsia-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                          >
                            {savingService ? "Adding..." : "Add service"}
                          </button>
                        </div>
                      </form>
                    )}

                    {activeServices.length === 0 && !addingService ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center sm:px-5">
                        <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-fuchsia-100 text-lg font-bold text-fuchsia-600">
                          +
                        </div>

                        <h5 className="text-sm font-bold text-slate-800">
                          No services scheduled
                        </h5>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          This day does not currently have an active service.
                        </p>

                        {isAdmin && (
                          <button
                            onClick={openAddService}
                            className="mt-4 rounded-lg bg-fuchsia-600 px-4 py-2 text-xs font-semibold text-white hover:bg-fuchsia-700 sm:text-sm"
                          >
                            Add service
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                        {activeServices.map((service) => (
                          <div
                            key={service.id}
                            className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-fuchsia-200 hover:shadow-md sm:p-4"
                          >
                            {editingServiceId === service.id ? (
                              <form onSubmit={handleUpdateService}>
                                <div className="mb-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                                    Edit service
                                  </p>
                                </div>

                                <div className="space-y-3">
                                  <Field label="Service name" required>
                                    <input
                                      value={editName}
                                      onChange={(e) =>
                                        setEditName(e.target.value)
                                      }
                                      className="input"
                                    />
                                  </Field>

                                  <div className="grid grid-cols-2 gap-2.5">
                                    <Field label="Start">
                                      <input
                                        type="time"
                                        value={editStartTime}
                                        onChange={(e) =>
                                          setEditStartTime(e.target.value)
                                        }
                                        className="input"
                                      />
                                    </Field>

                                    <Field label="End">
                                      <input
                                        type="time"
                                        value={editEndTime}
                                        onChange={(e) =>
                                          setEditEndTime(e.target.value)
                                        }
                                        className="input"
                                      />
                                    </Field>
                                  </div>

                                  <Field label="Description">
                                    <input
                                      value={editDescription}
                                      onChange={(e) =>
                                        setEditDescription(e.target.value)
                                      }
                                      className="input"
                                    />
                                  </Field>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={cancelEditingService}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                  >
                                    Cancel
                                  </button>

                                  <button
                                    type="submit"
                                    disabled={updatingService}
                                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                  >
                                    {updatingService ? "Saving..." : "Save"}
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />

                                      <h5 className="truncate text-sm font-bold text-slate-800">
                                        {service.name}
                                      </h5>
                                    </div>

                                    {service.description && (
                                      <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-slate-500">
                                        {service.description}
                                      </p>
                                    )}
                                  </div>

                                  <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-1 text-[9px] font-bold text-emerald-600">
                                    Active
                                  </span>
                                </div>

                                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                                    <span className="text-fuchsia-600">◷</span>

                                    <span className="truncate">
                                      {service.start_time
                                        ? formatTime(service.start_time)
                                        : "No start"}
                                    </span>

                                    <span className="text-slate-300">–</span>

                                    <span className="truncate">
                                      {service.end_time
                                        ? formatTime(service.end_time)
                                        : "No end"}
                                    </span>
                                  </div>
                                </div>

                                {isAdmin && (
                                  <div className="mt-3 grid grid-cols-2 gap-2">
                                    <button
                                      onClick={() =>
                                        startEditingService(service)
                                      }
                                      className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                                    >
                                      Edit
                                    </button>

                                    <button
                                      onClick={() =>
                                        handleRemoveService(service)
                                      }
                                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* Admin / non-event-staff quick actions */}
        {!isEventStaff && actions.length > 0 && (
          <section className="mt-6 sm:mt-7">
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-fuchsia-600 sm:text-xs">
                Quick actions
              </p>

              <h3 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
                What would you like to do?
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {actions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base font-bold ${getActionIconClass(
                        action.accent
                      )}`}
                    >
                      {action.icon}
                    </div>

                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-bold text-slate-800 group-hover:text-fuchsia-700">
                        {action.title}
                      </h4>

                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  description,
  loading,
  accent,
}: {
  label: string;
  value: number;
  description: string;
  loading: boolean;
  accent: "fuchsia" | "blue" | "purple" | "gold";
}) {
  const accentClasses = {
    fuchsia: "bg-fuchsia-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    gold: "bg-amber-500",
  };

  return (
    <div className="relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div
        className={`absolute left-0 top-0 h-1 w-full ${accentClasses[accent]}`}
      />

      <p className="truncate text-[10px] font-semibold text-slate-500 sm:text-xs">
        {label}
      </p>

      {loading ? (
        <div className="mt-2 h-7 w-12 animate-pulse rounded bg-slate-100 sm:h-8 sm:w-16" />
      ) : (
        <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {value.toLocaleString()}
        </p>
      )}

      <p className="mt-0.5 truncate text-[9px] text-slate-400 sm:mt-1 sm:text-[11px]">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-semibold text-slate-600 sm:text-xs">
        {label}
        {required && <span className="ml-1 text-fuchsia-600">*</span>}
      </span>

      {children}
    </label>
  );
}

function getActionIconClass(accent: string) {
  switch (accent) {
    case "blue":
      return "bg-blue-50 text-blue-600";
    case "purple":
      return "bg-purple-50 text-purple-600";
    case "gold":
      return "bg-amber-50 text-amber-600";
    case "dark":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-fuchsia-50 text-fuchsia-600";
  }
}


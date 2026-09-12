
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const statDescriptions = {
  Registered: "Total attendees",
  Today: "Attendance today",
  "New today": "New registrations",
  "Checked in": "Already attended",
};

const allActions = [
  {
    title: "Check in attendee",
    description: "Search and record today's attendance.",
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
    title: "Search attendees",
    description: "Find someone by name, phone or registration ID.",
    icon: "⌕",
    href: "/check-in",
    roles: ["admin", "event_staff"],
    accent: "light",
  },
  {
    title: "View reports",
    description: "See attendance and registration data.",
    icon: "▥",
    href: "/reports",
    roles: ["admin", "reports"],
    accent: "gold",
  },
  {
    title: "Manage users",
    description: "Create staff accounts and manage access.",
    icon: "♙",
    href: "/admin/users",
    roles: ["admin"],
    accent: "dark",
  },
];

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [currentEventDay, setCurrentEventDay] = useState<number | null>(null);
  const [loadingEventDay, setLoadingEventDay] = useState(true);
  const [updatingEventDay, setUpdatingEventDay] = useState(false);
  const [eventDayMessage, setEventDayMessage] = useState("");

  const [role, setRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const [dashboardStats, setDashboardStats] = useState({
    registered: 0,
    today: 0,
    new_today: 0,
    checked_in: 0,
  });

  const [loadingStats, setLoadingStats] = useState(true);

  const isAdmin = role === "admin";

  const actions = allActions.filter((action) =>
    role ? action.roles.includes(role) : false
  );

  useEffect(() => {
    let mounted = true;

    async function checkAuthentication() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Authentication check error:", error);
      }

      if (!mounted) return;

      if (!session) {
        window.location.replace("/login");
        return;
      }

      setAuthenticated(true);
      setCheckingAuth(false);
    }

    checkAuthentication();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (!session) {
        setAuthenticated(false);
        window.location.replace("/login");
        return;
      }

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        setAuthenticated(true);
        setCheckingAuth(false);
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
      setLoadingEventDay(true);
      setLoadingStats(true);

      const {
        data: userRole,
        error: roleError,
      } = await supabase.rpc("get_my_role");

      if (roleError) {
        console.error("Role error:", roleError);
        setRole("volunteer");
      } else {
        setRole(userRole);
      }

      setLoadingRole(false);

      const {
        data: eventDay,
        error: eventDayError,
      } = await supabase.rpc("get_current_event_day");

      if (eventDayError) {
        console.error("Event day error:", eventDayError);
        setEventDayMessage("Unable to load event day.");
      } else {
        setCurrentEventDay(eventDay);
      }

      setLoadingEventDay(false);

      const {
        data: statsData,
        error: statsError,
      } = await supabase.rpc("get_dashboard_stats");

      if (statsError) {
        console.error("Dashboard stats error:", statsError);
      } else if (statsData) {
        setDashboardStats({
          registered: Number(statsData.registered ?? 0),
          today: Number(statsData.today ?? 0),
          new_today: Number(statsData.new_today ?? 0),
          checked_in: Number(statsData.checked_in ?? 0),
        });
      }

      setLoadingStats(false);
    }

    loadDashboard();
  }, [authenticated]);

  async function handleEventDayChange(day: number) {
    if (!isAdmin) {
      setEventDayMessage(
        "Only administrators can change the event day."
      );
      return;
    }

    setUpdatingEventDay(true);
    setEventDayMessage("");

    const { data, error } = await supabase.rpc("set_current_event_day", {
      p_event_day: day,
    });

    setUpdatingEventDay(false);

    if (error) {
      console.error("Event day update error:", error);

      setEventDayMessage(
        "Unable to update event day. Only administrators can make this change."
      );
      return;
    }

    setCurrentEventDay(data);
    setEventDayMessage(`Event is now set to Day ${data}.`);

    setTimeout(() => {
      setEventDayMessage("");
    }, 3000);

    const {
      data: statsData,
      error: statsError,
    } = await supabase.rpc("get_dashboard_stats");

    if (statsError) {
      console.error("Dashboard stats refresh error:", statsError);
      return;
    }

    if (statsData) {
      setDashboardStats({
        registered: Number(statsData.registered ?? 0),
        today: Number(statsData.today ?? 0),
        new_today: Number(statsData.new_today ?? 0),
        checked_in: Number(statsData.checked_in ?? 0),
      });
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out error:", error);
      return;
    }

    window.location.replace("/login");
  }

  function getRoleLabel() {
    if (role === "admin") return "Administrator";
    if (role === "event_staff") return "Event Staff";
    if (role === "reports") return "Reports";
    return "Staff";
  }

  function getActionClasses(accent: string) {
    switch (accent) {
      case "blue":
        return {
          icon: "bg-blue-600 text-white",
          border: "hover:border-blue-300",
        };

      case "purple":
        return {
          icon: "bg-fuchsia-700 text-white",
          border: "hover:border-fuchsia-300",
        };

      case "gold":
        return {
          icon: "bg-amber-100 text-amber-700",
          border: "hover:border-amber-300",
        };

      case "dark":
        return {
          icon: "bg-slate-900 text-white",
          border: "hover:border-slate-400",
        };

      default:
        return {
          icon: "bg-sky-100 text-sky-700",
          border: "hover:border-sky-300",
        };
    }
  }

  if (checkingAuth || !authenticated || loadingRole) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-700 to-blue-600 text-lg font-black text-white shadow-lg">
            FV
          </div>

          <h1 className="mt-5 text-lg font-bold text-slate-900">
            Checking your access...
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Please wait while we verify your account.
          </p>

          <div className="mx-auto mt-5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-fuchsia-600" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {/* Temporary logo mark */}
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-700 via-purple-700 to-blue-600 text-sm font-black text-white shadow-md">
              <div className="absolute inset-1 rounded-xl border border-white/30" />
              <span className="relative">FV</span>
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-sm font-black tracking-tight text-slate-950 sm:text-base">
                Fountain of Victory Church
              </h1>

              <p className="truncate text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Event Registration System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden rounded-full bg-fuchsia-50 px-3 py-1.5 text-xs font-bold text-fuchsia-700 sm:block">
              {getRoleLabel()}
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 sm:flex">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <span className="text-xs font-bold text-blue-700">
                Day {currentEventDay ?? "..."}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:px-4"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Hero */}
        <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-800 via-purple-700 to-blue-700 p-6 text-white shadow-xl sm:p-8">
          {/* Decorative orbit */}
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[18px] border-white/10" />
          <div className="pointer-events-none absolute -right-5 -top-9 h-48 w-48 rounded-full border-2 border-amber-300/30" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-blue-400/10 blur-2xl" />

          <div className="relative max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-amber-300" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                Event dashboard
              </span>
            </div>

            <h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
              Welcome to Fountain of Victory Church
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
              Manage registrations, check-ins and event attendance from one
              place.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <div className="rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                  Current day
                </p>

                <p className="mt-0.5 text-sm font-black">
                  {loadingEventDay
                    ? "Loading..."
                    : `Event Day ${currentEventDay}`}
                </p>
              </div>

              <div className="rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                  Your access
                </p>

                <p className="mt-0.5 text-sm font-black">
                  {getRoleLabel()}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Admin Event Control */}
        {isAdmin && (
          <section className="mb-6 overflow-hidden rounded-3xl border border-fuchsia-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-fuchsia-50 to-blue-50 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-100 text-lg font-black text-fuchsia-700">
                  ★
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-fuchsia-700">
                    Administrator
                  </p>

                  <h3 className="text-base font-black text-slate-900">
                    Event day control
                  </h3>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Select the current event day
                  </p>

                  <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                    New attendance will be recorded against the selected
                    event day.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((day) => {
                    const isActive = currentEventDay === day;

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleEventDayChange(day)}
                        disabled={updatingEventDay || loadingEventDay}
                        className={`min-w-[58px] rounded-xl px-4 py-3 text-sm font-black transition active:scale-95 ${
                          isActive
                            ? "bg-gradient-to-r from-fuchsia-700 to-purple-700 text-white shadow-md shadow-fuchsia-200"
                            : "border border-slate-200 bg-white text-slate-700 hover:border-fuchsia-300 hover:bg-fuchsia-50"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        Day {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {eventDayMessage && (
                <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  ✓ {eventDayMessage}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Main Check-in CTA */}
        {(role === "admin" || role === "event_staff") && (
          <section className="mb-6">
            <Link
              href="/check-in"
              className="group relative block overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-fuchsia-600 to-blue-600" />

              <div className="flex items-center justify-between gap-5 p-5 sm:p-7">
                <div className="min-w-0">
                  <div className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700">
                    Fast entrance
                  </div>

                  <h3 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Check in attendee
                  </h3>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                    Search by name, phone number or registration ID and record
                    today's attendance.
                  </p>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-fuchsia-700 text-2xl font-black text-white shadow-lg transition group-hover:scale-105">
                  →
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Statistics */}
        <section className="mb-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-fuchsia-600">
                Live overview
              </p>

              <h3 className="mt-1 text-lg font-black text-slate-950">
                Today&apos;s attendance
              </h3>
            </div>

            <div className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
              Day {currentEventDay ?? "..."}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: "Registered",
                value: dashboardStats.registered,
                description: statDescriptions.Registered,
                icon: "♙",
                background: "bg-fuchsia-50",
                iconBackground: "bg-fuchsia-100",
                iconText: "text-fuchsia-700",
              },
              {
                label: "Today",
                value: dashboardStats.today,
                description: statDescriptions.Today,
                icon: "◷",
                background: "bg-blue-50",
                iconBackground: "bg-blue-100",
                iconText: "text-blue-700",
              },
              {
                label: "New today",
                value: dashboardStats.new_today,
                description: statDescriptions["New today"],
                icon: "+",
                background: "bg-sky-50",
                iconBackground: "bg-sky-100",
                iconText: "text-sky-700",
              },
              {
                label: "Checked in",
                value: dashboardStats.checked_in,
                description: statDescriptions["Checked in"],
                icon: "✓",
                background: "bg-amber-50",
                iconBackground: "bg-amber-100",
                iconText: "text-amber-700",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-2xl border border-slate-200 ${stat.background} p-4 shadow-sm sm:p-5`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500">
                      {stat.label}
                    </p>

                    <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                      {loadingStats
                        ? "..."
                        : stat.value.toLocaleString()}
                    </p>
                  </div>

                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${stat.iconBackground} ${stat.iconText}`}
                  >
                    {stat.icon}
                  </div>
                </div>

                <p className="mt-2 text-[11px] font-medium text-slate-400">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-fuchsia-600">
              Shortcuts
            </p>

            <h3 className="mt-1 text-lg font-black text-slate-950">
              Quick actions
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {actions.map((action) => {
              const classes = getActionClasses(action.accent);

              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className={`group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${classes.border}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-black shadow-sm ${classes.icon}`}
                    >
                      {action.icon}
                    </div>

                    <span className="text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-fuchsia-500">
                      →
                    </span>
                  </div>

                  <h4 className="mt-5 text-sm font-black text-slate-900">
                    {action.title}
                  </h4>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {action.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Footer Status */}
        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1 bg-gradient-to-r from-fuchsia-700 via-purple-600 to-blue-600" />

          <div className="flex items-center gap-4 p-5 sm:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-lg font-black text-emerald-600">
              ✓
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900">
                System online
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Registration and attendance services are ready for Event Day{" "}
                {currentEventDay ?? "..."}.
              </p>
            </div>

            <div className="ml-auto hidden rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 sm:block">
              Active
            </div>
          </div>
        </section>
      </div>

      {/* Mobile navigation */}
      <nav className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          <Link
            href="/"
            className="rounded-xl bg-fuchsia-50 px-2 py-2.5 text-center text-xs font-black text-fuchsia-700"
          >
            Home
          </Link>

          {(role === "admin" || role === "event_staff") && (
            <Link
              href="/check-in"
              className="rounded-xl px-2 py-2.5 text-center text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
            >
              Check in
            </Link>
          )}

          {role === "admin" || role === "event_staff" ? (
            <Link
              href="/register"
              className="rounded-xl px-2 py-2.5 text-center text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
            >
              Register
            </Link>
          ) : (
            <Link
              href="/reports"
              className="rounded-xl px-2 py-2.5 text-center text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
            >
              Reports
            </Link>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-xl px-2 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </nav>
    </main>
  );
}


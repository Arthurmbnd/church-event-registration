const stats = [
  {
    label: "Registered",
    value: "0",
    description: "Total attendees",
  },
  {
    label: "Today",
    value: "0",
    description: "Attendance today",
  },
  {
    label: "New today",
    value: "0",
    description: "New registrations",
  },
  {
    label: "Checked in",
    value: "0",
    description: "Already attended",
  },
];

const actions = [
  {
    title: "Check in attendee",
    description: "Search and record today's attendance.",
    icon: "✓",
    primary: true,
  },
  {
    title: "Register attendee",
    description: "Create a new attendee record.",
    icon: "+",
    primary: false,
  },
  {
    title: "Search attendees",
    description: "Find someone by name, phone or ID.",
    icon: "⌕",
    primary: false,
  },
  {
    title: "View reports",
    description: "See attendance and registration data.",
    icon: "▥",
    primary: false,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top navigation */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              CE
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold sm:text-base">
                Church Event
              </h1>
              <p className="truncate text-xs text-slate-500">
                Registration System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-medium text-slate-500 sm:block">
              EVENT DAY
            </span>

            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold">
              Day 1
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Welcome */}
        <section className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-500">
                Event dashboard
              </p>

              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Good morning 👋
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
                Manage attendee registration and quickly record attendance
                throughout the event.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 sm:self-auto">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              System online
            </div>
          </div>
        </section>

        {/* Main check-in CTA */}
        <section className="mb-6">
          <button
            type="button"
            className="group w-full rounded-2xl bg-slate-900 p-5 text-left text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99] sm:p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="mb-1 text-sm font-medium text-slate-300">
                  Fast entrance
                </p>

                <h3 className="text-xl font-bold sm:text-2xl">
                  Check in attendee
                </h3>

                <p className="mt-1 max-w-lg text-sm leading-5 text-slate-300">
                  Search by name, phone number, registration ID or QR code.
                </p>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-xl font-bold text-slate-900 transition group-hover:scale-105">
                →
              </div>
            </div>
          </button>
        </section>

        {/* Statistics */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Today's overview
            </h3>

            <span className="text-xs text-slate-400">Day 1</span>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <p className="text-xs font-medium text-slate-500 sm:text-sm">
                  {stat.label}
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  {stat.value}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick actions */}
        <section className="mt-8">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Quick actions
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {actions.map((action) => (
              <button
                key={action.title}
                type="button"
                className={`group rounded-2xl border p-5 text-left transition active:scale-[0.99] ${
                  action.primary
                    ? "border-slate-900 bg-white shadow-sm hover:bg-slate-50"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold ${
                      action.primary
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {action.icon}
                  </div>

                  <span className="text-slate-300 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>

                <h4 className="mt-4 text-sm font-semibold">
                  {action.title}
                </h4>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {action.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Today's event status */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              ✓
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-semibold">
                Registration system is ready
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Volunteers can register attendees and record today's
                attendance.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Mobile navigation */}
      <nav className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          <button
            type="button"
            className="rounded-xl bg-slate-100 px-2 py-2.5 text-xs font-semibold text-slate-900"
          >
            Home
          </button>

          <button
            type="button"
            className="rounded-xl px-2 py-2.5 text-xs font-medium text-slate-500"
          >
            Check in
          </button>

          <button
            type="button"
            className="rounded-xl px-2 py-2.5 text-xs font-medium text-slate-500"
          >
            Attendees
          </button>

          <button
            type="button"
            className="rounded-xl px-2 py-2.5 text-xs font-medium text-slate-500"
          >
            More
          </button>
        </div>
      </nav>
    </main>
  );
}
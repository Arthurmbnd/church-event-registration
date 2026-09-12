
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";

type SystemUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
};

const roles = [
  {
    value: "admin",
    label: "Administrator",
    description: "Full system access",
    shortDescription: "Full access",
    color: "gold",
  },
  {
    value: "event_staff",
    label: "Event Staff",
    description: "Register and check in attendees",
    shortDescription: "Registration + Check-in",
    color: "purple",
  },
  {
    value: "reports",
    label: "Reports",
    description: "View attendance reports",
    shortDescription: "Reports access",
    color: "blue",
  },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("event_staff");

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadUsers() {
    setLoading(true);
    setError("");

    const token = await getAccessToken();

    if (!token) {
      setError(
        "Your session has expired. Please sign in again."
      );
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/users", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load users.");
        setLoading(false);
        return;
      }

      setUsers(data.users || []);
    } catch (error) {
      console.error(error);
      setError("Unable to connect to the server.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function createUser(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setSaving(true);

    const token = await getAccessToken();

    if (!token) {
      setError(
        "Your session has expired. Please sign in again."
      );
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to create user.");
        setSaving(false);
        return;
      }

      setSuccess("User created successfully.");

      setFullName("");
      setEmail("");
      setPassword("");
      setRole("event_staff");

      await loadUsers();
    } catch (error) {
      console.error(error);
      setError("Unable to connect to the server.");
    }

    setSaving(false);
  }

  async function updateRole(
    userId: string,
    newRole: string
  ) {
    setError("");
    setSuccess("");

    const token = await getAccessToken();

    if (!token) {
      setError(
        "Your session has expired. Please sign in again."
      );
      return;
    }

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          role: newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Unable to update role."
        );
        return;
      }

      setSuccess("User role updated successfully.");

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === userId
            ? {
                ...currentUser,
                role: newRole,
              }
            : currentUser
        )
      );
    } catch (error) {
      console.error(error);
      setError("Unable to connect to the server.");
    }
  }

  function roleLabel(value: string) {
    return (
      roles.find((role) => role.value === value)?.label ||
      value
    );
  }

  function roleDescription(value: string) {
    return (
      roles.find((role) => role.value === value)?.description ||
      ""
    );
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function getRoleStyles(value: string) {
    switch (value) {
      case "admin":
        return {
          badge:
            "border-amber-200 bg-amber-50 text-amber-800",
          icon:
            "bg-amber-100 text-amber-700",
        };

      case "event_staff":
        return {
          badge:
            "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
          icon:
            "bg-fuchsia-100 text-fuchsia-700",
        };

      case "reports":
        return {
          badge:
            "border-blue-200 bg-blue-50 text-blue-800",
          icon:
            "bg-blue-100 text-blue-700",
        };

      default:
        return {
          badge:
            "border-slate-200 bg-slate-50 text-slate-700",
          icon:
            "bg-slate-100 text-slate-700",
        };
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-50 text-slate-900">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-700 transition hover:bg-fuchsia-50 hover:text-fuchsia-700"
              >
                ←
              </Link>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-700 via-purple-700 to-blue-600 text-sm font-black text-white shadow-md">
                FV
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-sm font-black tracking-tight text-slate-950 sm:text-base">
                  Fountain of Victory Church
                </h1>

                <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  User Management
                </p>
              </div>
            </div>

            <div className="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800 sm:block">
              Administrator
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Page introduction */}
          <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-800 via-purple-700 to-blue-700 p-6 text-white shadow-xl sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[18px] border-white/10" />

            <div className="pointer-events-none absolute -right-5 -top-9 h-48 w-48 rounded-full border-2 border-amber-300/30" />

            <div className="relative">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-300" />

                <span className="text-[10px] font-black uppercase tracking-wider">
                  Administration
                </span>
              </div>

              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                Manage system users
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
                Create staff accounts and control what each person can access
                within the event registration system.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-xl bg-white/10 px-4 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                    Users
                  </p>

                  <p className="mt-0.5 text-sm font-black">
                    {users.length}
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 px-4 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                    Access levels
                  </p>

                  <p className="mt-0.5 text-sm font-black">
                    {roles.length}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Messages */}
          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 font-black text-red-700">
                  !
                </div>

                <div>
                  <p className="text-sm font-black text-red-800">
                    Something went wrong
                  </p>

                  <p className="mt-1 text-sm leading-5 text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 font-black text-emerald-700">
                  ✓
                </div>

                <div>
                  <p className="text-sm font-black text-emerald-800">
                    Success
                  </p>

                  <p className="mt-1 text-sm leading-5 text-emerald-700">
                    {success}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            {/* Create User */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-fuchsia-50 to-blue-50 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-fuchsia-100 text-xl font-black text-fuchsia-700">
                    +
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-fuchsia-700">
                      New account
                    </p>

                    <h2 className="text-lg font-black text-slate-950">
                      Create staff account
                    </h2>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Add a new person to the event management system and assign
                  their access level.
                </p>
              </div>

              <form
                onSubmit={createUser}
                className="space-y-5 p-5 sm:p-6"
              >
                {/* Full Name */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-800">
                    Full name
                  </label>

                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                    placeholder="Enter full name"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-800">
                    Email address
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="staff@example.com"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-800">
                    Temporary password
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />

                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-500">
                    Give the staff member this password securely.
                  </p>
                </div>

                {/* Role */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-800">
                    Access level
                  </label>

                  <select
                    value={role}
                    onChange={(event) =>
                      setRole(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10"
                  >
                    {roles.map((item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>

                  <div className="mt-2 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-700">
                      {
                        roles.find(
                          (item) => item.value === role
                        )?.label
                      }
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      {
                        roles.find(
                          (item) => item.value === role
                        )?.description
                      }
                    </p>
                  </div>
                </div>

                {/* Create */}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-gradient-to-r from-fuchsia-700 to-purple-700 px-4 py-3.5 text-sm font-black text-white shadow-md shadow-fuchsia-200 transition hover:from-fuchsia-800 hover:to-purple-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Creating account..."
                    : "Create staff account"}
                </button>
              </form>
            </section>

            {/* Users */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {/* Header */}
              <div className="border-b border-slate-100 bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                      Directory
                    </p>

                    <h2 className="mt-1 text-lg font-black text-slate-950">
                      System users
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {users.length} user
                      {users.length === 1 ? "" : "s"} with system access.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={loadUsers}
                    disabled={loading}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                  >
                    <span className={loading ? "animate-spin" : ""}>
                      ↻
                    </span>
                    Refresh
                  </button>
                </div>
              </div>

              {/* User list */}
              {loading ? (
                <div className="p-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-50 text-lg font-black text-fuchsia-700">
                    FV
                  </div>

                  <p className="mt-4 text-sm font-bold text-slate-700">
                    Loading users...
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Please wait.
                  </p>
                </div>
              ) : users.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-500">
                    ♙
                  </div>

                  <p className="mt-4 text-sm font-bold text-slate-700">
                    No system users found.
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Create the first staff account using the form.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {users.map((user) => {
                    const roleStyles = getRoleStyles(user.role);

                    return (
                      <div
                        key={user.id}
                        className="p-5 transition hover:bg-slate-50/70 sm:p-6"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          {/* User information */}
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-100 to-blue-100 text-sm font-black text-fuchsia-700">
                              {user.full_name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <h3 className="break-words text-sm font-black text-slate-950 sm:text-base">
                                {user.full_name}
                              </h3>

                              <p className="mt-1 break-all text-xs text-slate-500 sm:text-sm">
                                {user.email}
                              </p>

                              <p className="mt-1.5 text-[10px] font-medium text-slate-400">
                                Added {formatDate(user.created_at)}
                              </p>
                            </div>
                          </div>

                          {/* Role */}
                          <div className="w-full lg:w-60">
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Access level
                            </label>

                            <select
                              value={user.role}
                              onChange={(event) =>
                                updateRole(
                                  user.id,
                                  event.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10"
                            >
                              {roles.map((item) => (
                                <option
                                  key={item.value}
                                  value={item.value}
                                >
                                  {item.label}
                                </option>
                              ))}
                            </select>

                            <div className="mt-2 flex items-center gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${roleStyles.badge}`}
                              >
                                {roleLabel(user.role)}
                              </span>

                              <span className="truncate text-[10px] text-slate-400">
                                {roleDescription(user.role)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Access Levels */}
          <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-wider text-fuchsia-600">
                Permissions
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-950">
                Access levels
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Each account receives access according to its assigned role.
              </p>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
              {roles.map((item) => {
                const styles = getRoleStyles(item.value);

                return (
                  <div
                    key={item.value}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${styles.icon}`}
                      >
                        {item.value === "admin"
                          ? "★"
                          : item.value === "event_staff"
                            ? "✓"
                            : "▥"}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900">
                          {item.label}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Security note */}
          <section className="mt-6 overflow-hidden rounded-3xl border border-blue-100 bg-blue-50">
            <div className="h-1 bg-gradient-to-r from-fuchsia-700 to-blue-600" />

            <div className="flex items-start gap-3 p-5 sm:p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white font-black text-blue-700 shadow-sm">
                i
              </div>

              <div>
                <h3 className="text-sm font-black text-blue-950">
                  Access management
                </h3>

                <p className="mt-1 text-xs leading-5 text-blue-800/70 sm:text-sm">
                  Assign only the access each staff member needs. Administrator
                  accounts have full control of the event system.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Mobile navigation */}
        <nav className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur sm:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
            <Link
              href="/"
              className="rounded-xl px-2 py-2.5 text-center text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
            >
              Home
            </Link>

            <Link
              href="/check-in"
              className="rounded-xl px-2 py-2.5 text-center text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
            >
              Check in
            </Link>

            <Link
              href="/register"
              className="rounded-xl px-2 py-2.5 text-center text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
            >
              Register
            </Link>

            <Link
              href="/"
              className="rounded-xl bg-fuchsia-50 px-2 py-2.5 text-center text-xs font-black text-fuchsia-700"
            >
              Admin
            </Link>
          </div>
        </nav>
      </main>
    </AuthGuard>
  );
}


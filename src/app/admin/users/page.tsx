
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type UserRole = "admin" | "event_staff" | "reports";

type SystemUser = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
};

const roles: {
  value: UserRole;
  label: string;
}[] = [
  {
    value: "admin",
    label: "Administrator",
  },
  {
    value: "event_staff",
    label: "Event Staff",
  },
  {
    value: "reports",
    label: "Reports",
  },
];

export default function AdminUsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [deletingUserId, setDeletingUserId] =
    useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] =
    useState<UserRole>("event_staff");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [userToDelete, setUserToDelete] =
    useState<SystemUser | null>(null);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const token = await getAccessToken();

      if (!token) {
        setError("Your session has expired.");
        return;
      }

      const response = await fetch(
        "/api/admin/users",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load users."
        );
      }

      setUsers(data.users || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function createUser() {
    setCreating(true);
    setError("");
    setMessage("");

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error(
          "Your session has expired."
        );
      }

      const response = await fetch(
        "/api/admin/users",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            full_name: fullName,
            email,
            password,
            role,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to create user."
        );
      }

      setMessage("User created successfully.");

      setFullName("");
      setEmail("");
      setPassword("");
      setRole("event_staff");

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create user."
      );
    } finally {
      setCreating(false);
    }
  }

  async function updateRole(
    userId: string,
    newRole: UserRole
  ) {
    setError("");
    setMessage("");

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error(
          "Your session has expired."
        );
      }

      const response = await fetch(
        "/api/admin/users",
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            role: newRole,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to update role."
        );
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId
            ? {
                ...user,
                role: newRole,
              }
            : user
        )
      );

      setMessage(
        "User role updated successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update role."
      );
    }
  }

  async function deleteUser() {
    if (!userToDelete) {
      return;
    }

    setDeletingUserId(userToDelete.id);
    setError("");
    setMessage("");

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error(
          "Your session has expired."
        );
      }

      const response = await fetch(
        "/api/admin/users",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userToDelete.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to delete user."
        );
      }

      setUsers((currentUsers) =>
        currentUsers.filter(
          (user) =>
            user.id !== userToDelete.id
        )
      );

      setMessage(
        "User deleted successfully."
      );

      setUserToDelete(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete user."
      );
    } finally {
      setDeletingUserId(null);
    }
  }

  function getRoleLabel(userRole: UserRole) {
    return (
      roles.find(
        (item) => item.value === userRole
      )?.label || userRole
    );
  }

  function getRoleBadgeClass(userRole: UserRole) {
    if (userRole === "admin") {
      return "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200";
    }

    if (userRole === "event_staff") {
      return "bg-blue-50 text-blue-700 ring-blue-200";
    }

    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">

        {/* Back Button */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path
                d="M19 12H5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 19l-7-7 7-7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </button>
        </div>

        {/* Page Header */}
        <div className="mb-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center rounded-full bg-gradient-to-r from-fuchsia-50 via-purple-50 to-blue-50 px-3 py-1 text-xs font-semibold text-purple-700 ring-1 ring-purple-100">
                Administration
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                System Users
              </h1>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                Create accounts, manage access levels,
                and remove users from the system.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start rounded-xl bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-slate-200 sm:self-auto">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-600 via-purple-600 to-blue-600 text-xs font-bold text-white">
                {users.length}
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400">
                  Total users
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  System accounts
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {message && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-700 shadow-sm">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              ✓
            </div>

            <p className="font-medium">
              {message}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700 shadow-sm">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
              !
            </div>

            <p className="font-medium">
              {error}
            </p>
          </div>
        )}

        {/* Create User */}
        <section className="mb-7 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-blue-600 text-white shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path
                    d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                  />
                  <circle
                    cx="9"
                    cy="7"
                    r="4"
                  />
                  <path d="M19 8v6M22 11h-6" />
                </svg>
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Add New User
                </h2>

                <p className="text-sm text-slate-500">
                  Create a new account and assign
                  their system role.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Full name
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value
                    )
                  }
                  placeholder="John Doe"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="john@example.com"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Minimum 6 characters"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Role
                </label>

                <select
                  value={role}
                  onChange={(event) =>
                    setRole(
                      event.target
                        .value as UserRole
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
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
              </div>
            </div>

            <div className="mt-5 flex flex-col justify-end gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setFullName("");
                  setEmail("");
                  setPassword("");
                  setRole("event_staff");
                }}
                disabled={creating}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={createUser}
                disabled={
                  creating ||
                  !fullName.trim() ||
                  !email.trim() ||
                  !password
                }
                className="h-11 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating
                  ? "Creating user..."
                  : "Create User"}
              </button>
            </div>
          </div>
        </section>

        {/* User Directory */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  User Directory
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  Manage roles and account access.
                </p>
              </div>

              {!loading && (
                <div className="text-sm text-slate-400">
                  {users.length}{" "}
                  {users.length === 1
                    ? "user"
                    : "users"}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-purple-600" />
              <p className="text-sm text-slate-500">
                Loading users...
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-6 w-6"
                >
                  <path
                    d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                  />
                  <circle
                    cx="9"
                    cy="7"
                    r="4"
                  />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>

              <p className="font-medium text-slate-700">
                No users found
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Create your first system user above.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        User
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Role
                      </th>

                      <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Created
                      </th>

                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="transition hover:bg-slate-50/60"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-100 via-purple-100 to-blue-100 text-sm font-bold text-purple-700">
                              {user.full_name
                                .trim()
                                .charAt(0)
                                .toUpperCase() ||
                                "U"}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-800">
                                {user.full_name}
                              </p>

                              <p className="mt-0.5 max-w-[300px] truncate text-sm text-slate-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getRoleBadgeClass(
                                user.role
                              )}`}
                            >
                              {getRoleLabel(
                                user.role
                              )}
                            </span>

                            <select
                              value={user.role}
                              onChange={(event) =>
                                updateRole(
                                  user.id,
                                  event.target
                                    .value as UserRole
                                )
                              }
                              disabled={
                                deletingUserId ===
                                user.id
                              }
                              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10 disabled:opacity-50"
                            >
                              {roles.map(
                                (item) => (
                                  <option
                                    key={
                                      item.value
                                    }
                                    value={
                                      item.value
                                    }
                                  >
                                    {item.label}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                          {new Date(
                            user.created_at
                          ).toLocaleDateString(
                            undefined,
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setUserToDelete(
                                user
                              )
                            }
                            disabled={
                              deletingUserId ===
                              user.id
                            }
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="h-3.5 w-3.5"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v5M14 11v5" />
                            </svg>

                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="divide-y divide-slate-100 md:hidden">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-100 via-purple-100 to-blue-100 text-sm font-bold text-purple-700">
                        {user.full_name
                          .trim()
                          .charAt(0)
                          .toUpperCase() ||
                          "U"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800">
                              {user.full_name}
                            </p>

                            <p className="mt-0.5 break-all text-sm text-slate-500">
                              {user.email}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${getRoleBadgeClass(
                              user.role
                            )}`}
                          >
                            {getRoleLabel(
                              user.role
                            )}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-col gap-2.5">
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Access role
                            </label>

                            <select
                              value={user.role}
                              onChange={(event) =>
                                updateRole(
                                  user.id,
                                  event.target
                                    .value as UserRole
                                )
                              }
                              disabled={
                                deletingUserId ===
                                user.id
                              }
                              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-500/10 disabled:opacity-50"
                            >
                              {roles.map(
                                (item) => (
                                  <option
                                    key={
                                      item.value
                                    }
                                    value={
                                      item.value
                                    }
                                  >
                                    {item.label}
                                  </option>
                                )
                              )}
                            </select>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-slate-400">
                              Created{" "}
                              {new Date(
                                user.created_at
                              ).toLocaleDateString(
                                undefined,
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                setUserToDelete(
                                  user
                                )
                              }
                              disabled={
                                deletingUserId ===
                                user.id
                              }
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-3.5 w-3.5"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v5M14 11v5" />
                              </svg>

                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
          >
            <div className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-6 w-6"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v5M14 11v5" />
                </svg>
              </div>

              <h3
                id="delete-user-title"
                className="mt-4 text-lg font-bold text-slate-900"
              >
                Delete user?
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                You are about to permanently delete
                the account for{" "}
                <span className="font-semibold text-slate-700">
                  {userToDelete.full_name}
                </span>
                .
              </p>

              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3">
                <p className="break-all text-xs font-medium text-red-700">
                  {userToDelete.email}
                </p>

                <p className="mt-1 text-xs text-red-600">
                  Their login account and system
                  profile will be removed.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setUserToDelete(null)
                }
                disabled={
                  deletingUserId !== null
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={deleteUser}
                disabled={
                  deletingUserId !== null
                }
                className="h-10 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingUserId
                  ? "Deleting..."
                  : "Yes, Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


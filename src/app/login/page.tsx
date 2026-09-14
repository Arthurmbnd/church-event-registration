
"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const { error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    setLoading(false);

    if (error) {
      console.error("Login error:", error);
      setErrorMessage(
        "Invalid email or password."
      );
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-8 text-slate-900">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-fuchsia-200/40 blur-3xl" />

        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />

        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-purple-200/25 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* =================================================
            Brand
        ================================================== */}

        <div className="mb-7 text-center">
          {/* Logo */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-blue-600 text-lg font-black text-white shadow-lg shadow-purple-200">
            CE
          </div>

          <div className="mt-5">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-600">
              Fountain of Victory Church
            </div>

            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Church Event
            </h1>

            <p className="mt-1 text-sm font-medium text-slate-500">
              Registration & Attendance System
            </p>
          </div>
        </div>

        {/* =================================================
            Login Card
        ================================================== */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
          {/* Gradient top bar */}
          <div className="h-1.5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-blue-600" />

          <div className="p-6 sm:p-8">
            {/* Heading */}
            <div className="mb-7">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-600">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Welcome back
              </h2>

              <p className="mt-1.5 text-sm leading-6 text-slate-500">
                Sign in to manage event registration
                and attendance.
              </p>
            </div>

            {/* =================================================
                Form
            ================================================== */}

            <form
              onSubmit={handleLogin}
              className="space-y-5"
            >
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-[11px] font-black uppercase tracking-wide text-slate-500"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fuchsia-400" />

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="admin@example.com"
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-fuchsia-300 focus:bg-white focus:ring-4 focus:ring-fuchsia-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-[11px] font-black uppercase tracking-wide text-slate-500"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="Enter your password"
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[11px] font-black text-red-700">
                      !
                    </div>

                    <div className="text-sm font-semibold leading-5 text-red-700">
                      {errorMessage}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-purple-200 transition hover:shadow-xl hover:shadow-purple-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {/* subtle hover layer */}
                <span className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100" />

                <span className="relative">
                  {loading
                    ? "Signing in..."
                    : "Sign in"}
                </span>
              </button>
            </form>

            {/* Security note */}
            <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-100 pt-5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />

              <span className="text-[10px] font-bold text-slate-400">
                Secure church administration portal
              </span>
            </div>
          </div>
        </div>

        {/* =================================================
            Footer
        ================================================== */}

        <p className="mt-6 text-center text-[10px] font-medium text-slate-400">
          Fountain of Victory Church
          <span className="mx-1.5 text-slate-300">
            •
          </span>
          Church Event Registration System
        </p>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Info,
  MapPin,
  Phone,
  Upload,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ImportRow = {
  full_name?: string;
  phone?: string;
  church?: string;
  location?: string;
  gender?: string;
  membership_status?: string;
};

type ImportResult = {
  row: number;
  name: string;
  status: "success" | "error";
  registration_number?: string;
  message?: string;
};

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [church, setChurch] = useState("");
  const [location, setLocation] = useState("");
  const [gender, setGender] = useState("");
  const [membershipStatus, setMembershipStatus] = useState("");

  const [loading, setLoading] = useState(false);
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [error, setError] = useState("");

  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importError, setImportError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setRegistrationNumber("");

    try {
      if (!fullName.trim()) {
        throw new Error("Full name is required.");
      }

      if (!gender) {
        throw new Error("Please select gender.");
      }

      if (!membershipStatus) {
        throw new Error("Please select member or visitor.");
      }

      const { data, error: rpcError } = await supabase.rpc(
        "register_attendee",
        {
          p_full_name: fullName.trim(),
          p_phone: phone.trim() || null,
          p_church: church.trim() || null,
          p_location: location.trim() || null,
          p_gender: gender,
          p_membership_status: membershipStatus,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setRegistrationNumber(data);
    } catch (err: any) {
      setError(err?.message || "Unable to complete registration.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFullName("");
    setPhone("");
    setChurch("");
    setLocation("");
    setGender("");
    setMembershipStatus("");
    setRegistrationNumber("");
    setError("");
  };

  const downloadTemplate = () => {
    const template = [
      {
        full_name: "John Banda",
        phone: "0999123456",
        church: "Fountain of Victory Church",
        location: "Lilongwe",
        gender: "male",
        membership_status: "member",
      },
      {
        full_name: "Mary Phiri",
        phone: "0888123456",
        church: "Fountain of Victory Church",
        location: "Area 25",
        gender: "female",
        membership_status: "visitor",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");

    XLSX.writeFile(workbook, "registration_template.xlsx");
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] || null;

    setSelectedFile(file);
    setImportResults([]);
    setImportError("");
  };

  const handleBulkImport = async () => {
    if (!selectedFile) {
      setImportError("Please select an Excel file first.");
      return;
    }

    setImporting(true);
    setImportError("");
    setImportResults([]);

    try {
      const buffer = await selectedFile.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json<ImportRow>(
        firstSheet,
        {
          defval: "",
        }
      );

      if (!rows.length) {
        throw new Error(
          "The selected Excel file contains no records."
        );
      }

      const results: ImportResult[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        const name = String(row.full_name || "").trim();

        try {
          if (!name) {
            throw new Error("Full name is required.");
          }

          const rowGender = String(row.gender || "")
            .trim()
            .toLowerCase();

          const rowMembership = String(
            row.membership_status || ""
          )
            .trim()
            .toLowerCase();

          if (
            rowGender &&
            !["male", "female"].includes(rowGender)
          ) {
            throw new Error(
              "Gender must be male or female."
            );
          }

          if (
            rowMembership &&
            !["member", "visitor"].includes(rowMembership)
          ) {
            throw new Error(
              "Membership status must be member or visitor."
            );
          }

          const { data, error: rpcError } =
            await supabase.rpc("register_attendee", {
              p_full_name: name,
              p_phone:
                String(row.phone || "").trim() || null,
              p_church:
                String(row.church || "").trim() || null,
              p_location:
                String(row.location || "").trim() || null,
              p_gender: rowGender || null,
              p_membership_status:
                rowMembership || null,
            });

          if (rpcError) {
            throw rpcError;
          }

          results.push({
            row: i + 2,
            name,
            status: "success",
            registration_number: data,
          });
        } catch (err: any) {
          results.push({
            row: i + 2,
            name: name || "Unnamed attendee",
            status: "error",
            message:
              err?.message || "Registration failed.",
          });
        }
      }

      setImportResults(results);
    } catch (err: any) {
      setImportError(
        err?.message ||
          "Unable to process the Excel file."
      );
    } finally {
      setImporting(false);
    }
  };

  const successfulImports = importResults.filter(
    (result) => result.status === "success"
  ).length;

  const failedImports = importResults.filter(
    (result) => result.status === "error"
  ).length;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center px-3 py-2.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <Link
              href="/"
              aria-label="Back to dashboard"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-fuchsia-200 hover:bg-fuchsia-50 hover:text-fuchsia-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-purple-600 shadow-sm sm:h-10 sm:w-10">
              <UserPlus className="h-4 w-4 text-white sm:h-5 sm:w-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-900 sm:text-sm">
                Fountain of Victory Church
              </p>

              <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                Attendee Registration
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="ml-2 hidden shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-fuchsia-700 sm:block"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-700 via-purple-700 to-blue-700 px-4 py-6 shadow-lg sm:px-7 sm:py-8 lg:px-8">
          <div className="relative z-10">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold backdrop-blur sm:text-xs">
              <UserPlus className="h-3.5 w-3.5 shrink-0" />
              <span>Attendee Registration</span>
            </div>

            <h1 className="mt-3 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Register an attendee
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
              Add a new attendee and capture the information
              needed for attendance tracking.
            </p>
          </div>

          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-10 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />
        </section>

        {/* ERROR */}
        {error && (
          <div className="mt-4 flex min-w-0 items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 sm:mt-5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0">
              <p className="font-semibold">
                Registration failed
              </p>

              <p className="mt-1 break-words text-sm">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {registrationNumber && (
          <div className="mt-4 min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:mt-5 sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>

              <div className="min-w-0">
                <p className="font-bold text-emerald-900">
                  Registration completed
                </p>

                <p className="mt-1 text-sm text-emerald-700">
                  The attendee has been successfully registered.
                </p>

                <div className="mt-3 flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2">
                  <span className="text-xs font-medium text-slate-500">
                    Registration No.
                  </span>

                  <span className="break-all font-mono text-sm font-bold text-emerald-700">
                    {registrationNumber}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:flex">
              <button
                type="button"
                onClick={resetForm}
                className="w-full rounded-xl bg-gradient-to-r from-fuchsia-700 via-purple-700 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 sm:w-auto"
              >
                Register another attendee
              </button>

              <Link
                href="/check-in"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 sm:w-auto"
              >
                <ClipboardCheck className="h-4 w-4" />
                Go to check-in
              </Link>
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        <div className="mt-5 space-y-5 lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:space-y-0">
          {/* REGISTRATION FORM */}
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-5 sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-50">
                  <UserRound className="h-5 w-5 text-fuchsia-600" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                    Individual registration
                  </h2>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Enter the attendee&apos;s details below.
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleRegister}
              className="p-4 sm:p-6"
            >
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                {/* FULL NAME */}
                <div className="min-w-0 sm:col-span-2">
                  <label
                    htmlFor="full-name"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Full name{" "}
                    <span className="text-fuchsia-600">
                      *
                    </span>
                  </label>

                  <div className="relative min-w-0">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="full-name"
                      value={fullName}
                      onChange={(e) =>
                        setFullName(e.target.value)
                      }
                      placeholder="Enter full name"
                      autoComplete="name"
                      className="box-border block w-full min-w-0 rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-50 sm:pr-4"
                    />
                  </div>
                </div>

                {/* GENDER */}
                <div className="min-w-0">
                  <label
                    htmlFor="gender"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Gender{" "}
                    <span className="text-fuchsia-600">
                      *
                    </span>
                  </label>

                  <div className="relative min-w-0">
                    <UsersRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) =>
                        setGender(e.target.value)
                      }
                      className="box-border block w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-50 sm:pr-4"
                    >
                      <option value="">
                        Select gender
                      </option>
                      <option value="male">Male</option>
                      <option value="female">
                        Female
                      </option>
                    </select>
                  </div>
                </div>

                {/* MEMBERSHIP */}
                <div className="min-w-0">
                  <label
                    htmlFor="membership"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Member / Visitor{" "}
                    <span className="text-fuchsia-600">
                      *
                    </span>
                  </label>

                  <div className="relative min-w-0">
                    <ClipboardCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <select
                      id="membership"
                      value={membershipStatus}
                      onChange={(e) =>
                        setMembershipStatus(
                          e.target.value
                        )
                      }
                      className="box-border block w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-50 sm:pr-4"
                    >
                      <option value="">
                        Select type
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

                {/* PHONE */}
                <div className="min-w-0">
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Phone{" "}
                    <span className="font-normal text-slate-400">
                      (optional)
                    </span>
                  </label>

                  <div className="relative min-w-0">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value)
                      }
                      placeholder="Phone number"
                      autoComplete="tel"
                      className="box-border block w-full min-w-0 rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-50 sm:pr-4"
                    />
                  </div>
                </div>

                {/* CHURCH */}
                <div className="min-w-0">
                  <label
                    htmlFor="church"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Church{" "}
                    <span className="font-normal text-slate-400">
                      (optional)
                    </span>
                  </label>

                  <div className="relative min-w-0">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="church"
                      value={church}
                      onChange={(e) =>
                        setChurch(e.target.value)
                      }
                      placeholder="Church name"
                      className="box-border block w-full min-w-0 rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-50 sm:pr-4"
                    />
                  </div>
                </div>

                {/* LOCATION */}
                <div className="min-w-0 sm:col-span-2">
                  <label
                    htmlFor="location"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Location{" "}
                    <span className="font-normal text-slate-400">
                      (optional)
                    </span>
                  </label>

                  <div className="relative min-w-0">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="location"
                      value={location}
                      onChange={(e) =>
                        setLocation(e.target.value)
                      }
                      placeholder="Area, town or city"
                      className="box-border block w-full min-w-0 rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-50 sm:pr-4"
                    />
                  </div>
                </div>
              </div>

              {/* SUBMIT */}
              <div className="mt-5 border-t border-slate-100 pt-5 sm:mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-700 via-purple-700 to-blue-700 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-48"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Register attendee
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* SIDE CONTENT */}
          <aside className="min-w-0 space-y-5">
            {/* BULK REGISTRATION */}
            <section className="min-w-0 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() =>
                  setBulkOpen((open) => !open)
                }
                aria-expanded={bulkOpen}
                className="flex w-full min-w-0 items-center justify-between gap-3 p-4 text-left transition hover:bg-blue-50/50 sm:p-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                      Bulk registration
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Register multiple attendees from
                      Excel.
                    </p>
                  </div>
                </div>

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  {bulkOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {bulkOpen && (
                <div className="min-w-0 border-t border-blue-100 bg-blue-50/40 p-4 sm:p-5">
                  {/* Upload box */}
                  <div className="min-w-0 rounded-xl border border-dashed border-blue-200 bg-white p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <Upload className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          Upload Excel file
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Use the provided template to
                          avoid column formatting problems.
                        </p>
                      </div>
                    </div>

                    <label className="mt-4 flex min-w-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50">
                      <Upload className="mr-2 h-4 w-4 shrink-0 text-blue-600" />

                      <span className="min-w-0 max-w-full truncate">
                        {selectedFile
                          ? selectedFile.name
                          : "Choose Excel file"}
                      </span>

                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-fuchsia-200 hover:bg-fuchsia-50 hover:text-fuchsia-700"
                    >
                      <Download className="h-4 w-4 shrink-0" />
                      Download template
                    </button>

                    <button
                      type="button"
                      onClick={handleBulkImport}
                      disabled={
                        importing || !selectedFile
                      }
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {importing ? (
                        <>
                          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 shrink-0" />
                          Import registrations
                        </>
                      )}
                    </button>
                  </div>

                  {/* Supported columns */}
                  <div className="mt-4 flex min-w-0 items-start gap-2 rounded-xl border border-blue-100 bg-white p-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                    <p className="min-w-0 break-words text-xs leading-5 text-slate-600">
                      Columns supported:{" "}
                      <span className="font-semibold">
                        full_name, phone, church, location,
                        gender, membership_status
                      </span>
                      .
                    </p>
                  </div>

                  {/* Import error */}
                  {importError && (
                    <div className="mt-4 flex min-w-0 items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                      <span className="min-w-0 break-words">
                        {importError}
                      </span>
                    </div>
                  )}

                  {/* Import results */}
                  {importResults.length > 0 && (
                    <div className="mt-5 min-w-0">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                          <p className="text-xs font-medium text-emerald-600">
                            Successful
                          </p>

                          <p className="mt-1 text-xl font-bold text-emerald-800">
                            {successfulImports}
                          </p>
                        </div>

                        <div className="min-w-0 rounded-xl border border-red-100 bg-red-50 p-3">
                          <p className="text-xs font-medium text-red-600">
                            Failed
                          </p>

                          <p className="mt-1 text-xl font-bold text-red-800">
                            {failedImports}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 max-h-80 min-w-0 space-y-2 overflow-y-auto pr-1">
                        {importResults.map(
                          (result, index) => (
                            <div
                              key={`${result.row}-${index}`}
                              className="min-w-0 rounded-xl border border-slate-200 bg-white p-3"
                            >
                              <div className="flex min-w-0 items-start gap-2">
                                {result.status ===
                                "success" ? (
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                ) : (
                                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                                )}

                                <div className="min-w-0 flex-1">
                                  <p className="break-words text-sm font-semibold text-slate-800">
                                    {result.name}
                                  </p>

                                  {result.status ===
                                  "success" ? (
                                    <p className="mt-1 break-all font-mono text-xs text-emerald-700">
                                      {
                                        result.registration_number
                                      }
                                    </p>
                                  ) : (
                                    <p className="mt-1 break-words text-xs text-red-600">
                                      {result.message}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* INFORMATION */}
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-50">
                  <Info className="h-5 w-5 text-fuchsia-600" />
                </div>

                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900">
                    Registration information
                  </h3>

                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />

                      <span>
                        A unique registration number is
                        generated automatically.
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />

                      <span>
                        Gender and member/visitor status are
                        captured for reporting.
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />

                      <span>
                        Registration and service check-in are
                        separate processes.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>

        {/* REMINDER */}
        <section className="mt-5 min-w-0 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:mt-6 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <Info className="h-4 w-4 text-amber-700" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-amber-900">
                After registration
              </p>

              <p className="mt-1 text-sm leading-5 text-amber-800">
                Take the attendee to the check-in page when
                you are ready to record attendance for a
                specific service.
              </p>

              <Link
                href="/check-in"
                className="mt-3 inline-flex max-w-full items-center gap-2 text-sm font-bold text-amber-900 underline decoration-amber-300 underline-offset-4 hover:text-amber-700"
              >
                Go to check-in
                <ClipboardCheck className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="mt-4 border-t border-slate-200 bg-white sm:mt-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-3 py-5 text-center text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left lg:px-8">
          <p>Fountain of Victory Church</p>
          <p>Event Registration System</p>
        </div>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";

type ImportRow = {
  fullName: string;
  phone: string;
  church: string;
  location: string;
};

type ImportResult = {
  row: number;
  name: string;
  success: boolean;
  message: string;
};

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [church, setChurch] = useState("");
  const [location, setLocation] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importFileName, setImportFileName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function registerAttendee(
    attendee: ImportRow
  ): Promise<string> {
    const { data, error } = await supabase.rpc("register_attendee", {
      p_full_name: attendee.fullName.trim(),
      p_phone: attendee.phone.trim() || null,
      p_church: attendee.church.trim() || null,
      p_location: attendee.location.trim() || null,
    });

    if (error) {
      throw error;
    }

    return String(data);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (!fullName.trim()) {
      setErrorMessage("Please enter the attendee's full name.");
      return;
    }

    setIsSubmitting(true);

    try {
      const registrationNumber = await registerAttendee({
        fullName,
        phone,
        church,
        location,
      });

      setSuccessMessage(
        `Attendee registered successfully. Registration number: ${registrationNumber}`
      );

      setFullName("");
      setPhone("");
      setChurch("");
      setLocation("");
    } catch (error) {
      console.error("Registration error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while registering the attendee."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function normalizeHeader(value: unknown) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ");
  }

  function getCell(row: Record<string, unknown>, names: string[]) {
    const entry = Object.entries(row).find(([key]) =>
      names.includes(normalizeHeader(key))
    );

    return entry ? String(entry[1] ?? "").trim() : "";
  }

  async function handleExcelImport(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setImportFileName(file.name);
    setImportResults([]);
    setSuccessMessage("");
    setErrorMessage("");

    setIsImporting(true);

    try {
      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      if (workbook.SheetNames.length === 0) {
        throw new Error("The Excel file does not contain a worksheet.");
      }

      const worksheet =
        workbook.Sheets[workbook.SheetNames[0]];

      const rawRows = XLSX.utils.sheet_to_json<
        Record<string, unknown>
      >(worksheet, {
        defval: "",
      });

      if (rawRows.length === 0) {
        throw new Error("The Excel file does not contain any attendees.");
      }

      const rows: ImportRow[] = rawRows.map((row) => ({
        fullName: getCell(row, [
          "full name",
          "fullname",
          "name",
          "attendee name",
        ]),
        phone: getCell(row, [
          "phone",
          "phone number",
          "telephone",
          "mobile",
        ]),
        church: getCell(row, [
          "church",
          "church name",
        ]),
        location: getCell(row, [
          "location",
          "city",
          "area",
          "district",
        ]),
      }));

      const missingNameRows = rows
        .map((row, index) => ({
          row,
          index,
        }))
        .filter(({ row }) => !row.fullName);

      if (missingNameRows.length > 0) {
        const rowNumbers = missingNameRows
          .map(({ index }) => index + 2)
          .join(", ");

        throw new Error(
          `Full Name is missing on Excel row(s): ${rowNumbers}.`
        );
      }

      const results: ImportResult[] = [];

      /*
       * Register sequentially.
       *
       * This deliberately uses the same RPC as the normal
       * registration form, so registration-number generation
       * and existing database rules remain unchanged.
       */
      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];

        try {
          const registrationNumber =
            await registerAttendee(row);

          results.push({
            row: index + 2,
            name: row.fullName,
            success: true,
            message: `Registered: ${registrationNumber}`,
          });
        } catch (error) {
          console.error(
            `Import registration error on row ${index + 2}:`,
            error
          );

          results.push({
            row: index + 2,
            name: row.fullName,
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Registration failed.",
          });
        }
      }

      setImportResults(results);

      const successful = results.filter(
        (result) => result.success
      ).length;

      const failed = results.length - successful;

      if (failed === 0) {
        setSuccessMessage(
          `Excel import completed successfully. ${successful} attendee${
            successful === 1 ? "" : "s"
          } registered.`
        );
      } else {
        setErrorMessage(
          `Excel import completed with ${successful} successful registration${
            successful === 1 ? "" : "s"
          } and ${failed} failed registration${
            failed === 1 ? "" : "s"
          }. See the results below.`
        );
      }
    } catch (error) {
      console.error("Excel import error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while importing the Excel file."
      );
    } finally {
      setIsImporting(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function clearImport() {
    setImportResults([]);
    setImportFileName("");
    setSuccessMessage("");
    setErrorMessage("");
  }

  function downloadTemplate() {
    const data = [
      {
        "Full Name": "John Banda",
        Phone: "0991234567",
        Church: "Fountain of Victory Church",
        Location: "Blantyre",
      },
      {
        "Full Name": "Mary Phiri",
        Phone: "0881234567",
        Church: "Victory Chapel",
        Location: "Lilongwe",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);

    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 18 },
      { wch: 32 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Attendees"
    );

    XLSX.writeFile(
      workbook,
      "fountain-of-victory-registration-template.xlsx"
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-50 text-slate-900">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-700 via-purple-700 to-blue-700 text-lg font-black text-white shadow-sm transition hover:from-fuchsia-800 hover:to-blue-800"
              >
                ←
              </Link>

              <div className="flex min-w-0 items-center gap-3">
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-700 via-purple-700 to-blue-700 text-xs font-black text-white sm:flex">
                  FV
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-fuchsia-700 sm:text-xs">
                    Fountain of Victory Church
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    Attendance & Registration
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/check-in"
              className="shrink-0 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 sm:px-4 sm:text-sm"
            >
              Check in
            </Link>
          </div>
        </header>

        <div className="mx-auto w-full max-w-5xl px-3 pb-10 pt-5 sm:px-6 sm:pb-12 sm:pt-8">
          {/* Hero */}
          <section className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-800 via-purple-700 to-blue-700 p-5 text-white shadow-lg sm:p-7">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border-[18px] border-white/10" />
            <div className="pointer-events-none absolute -right-4 -top-10 h-40 w-40 rounded-full border-2 border-amber-300/30" />
            <div className="pointer-events-none absolute bottom-[-90px] left-[-60px] h-52 w-52 rounded-full border-[15px] border-white/5" />

            <div className="relative flex items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/90 sm:text-xs">
                  <span className="h-2 w-2 rounded-full bg-amber-300" />
                  Registration
                </div>

                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  Register attendees
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                  Register individual attendees or import multiple
                  attendees from an Excel spreadsheet.
                </p>
              </div>

              <div className="hidden shrink-0 sm:flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-3xl font-black shadow-inner">
                +
              </div>
            </div>

            <div className="relative mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-300 text-sm font-black text-slate-900">
                1
              </div>

              <div>
                <p className="text-sm font-bold">
                  One-time registration
                </p>

                <p className="text-xs text-white/60">
                  Register each person only once.
                </p>
              </div>
            </div>
          </section>

          {/* Success */}
          {successMessage && (
            <section className="mb-5 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
              <div className="bg-emerald-50 px-5 py-4 sm:px-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-black text-emerald-700">
                    ✓
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                      Success
                    </p>

                    <h2 className="mt-1 text-base font-black text-emerald-950 sm:text-lg">
                      Registration successful
                    </h2>

                    <p className="mt-1 break-words text-sm leading-5 text-emerald-700">
                      {successMessage}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-4 sm:flex-row sm:p-5">
                <Link
                  href="/check-in"
                  className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-700 to-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:from-fuchsia-800 hover:to-blue-800"
                >
                  Check in this attendee →
                </Link>

                <button
                  type="button"
                  onClick={() => setSuccessMessage("")}
                  className="min-h-12 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Register another
                </button>
              </div>
            </section>
          )}

          {/* Error */}
          {errorMessage && (
            <section className="mb-5 rounded-3xl border border-red-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-black text-red-700">
                  !
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-black text-red-900">
                    Registration issue
                  </p>

                  <p className="mt-1 break-words text-sm leading-5 text-red-700">
                    {errorMessage}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Excel Import */}
          <section className="mb-5 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
            <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-fuchsia-50 px-5 py-5 sm:px-7">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-fuchsia-100 text-lg">
                  📊
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-black text-slate-950 sm:text-lg">
                    Bulk registration
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                    Import multiple attendees from an Excel
                    spreadsheet instead of entering them one at a time.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div className="rounded-2xl border border-dashed border-blue-200 bg-gradient-to-br from-blue-50/70 to-fuchsia-50/70 p-5 sm:p-6">
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                    📁
                  </div>

                  <h3 className="mt-4 text-base font-black text-slate-900">
                    Import an Excel file
                  </h3>

                  <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500 sm:text-sm">
                    Upload an .xlsx or .xls file containing the same
                    information used by the registration form.
                  </p>

                  <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isImporting}
                      className="min-h-12 rounded-xl bg-gradient-to-r from-fuchsia-700 to-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:from-fuchsia-800 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isImporting
                        ? "Importing attendees..."
                        : "Choose Excel file"}
                    </button>

                    <button
                      type="button"
                      onClick={downloadTemplate}
                      disabled={isImporting}
                      className="min-h-12 rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
                    >
                      ↓ Download template
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelImport}
                    className="hidden"
                  />

                  {importFileName && (
                    <p className="mt-4 text-xs font-semibold text-slate-500">
                      File:{" "}
                      <span className="text-[#741b82]">
                        {importFileName}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Excel columns */}
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                {[
                  {
                    title: "Full Name",
                    required: true,
                    description: "Required",
                  },
                  {
                    title: "Phone",
                    required: false,
                    description: "Optional",
                  },
                  {
                    title: "Church",
                    required: false,
                    description: "Optional",
                  },
                  {
                    title: "Location",
                    required: false,
                    description: "Optional",
                  },
                ].map((column) => (
                  <div
                    key={column.title}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-slate-700">
                        {column.title}
                      </p>

                      <span
                        className={`text-[9px] font-bold uppercase ${
                          column.required
                            ? "text-fuchsia-700"
                            : "text-slate-400"
                        }`}
                      >
                        {column.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3.5">
                <p className="text-xs leading-5 text-amber-800">
                  <strong>Important:</strong> Each imported row is
                  registered using the same database registration
                  function as the normal form. Registration numbers
                  therefore continue to be generated automatically.
                </p>
              </div>
            </div>
          </section>

          {/* Import Results */}
          {importResults.length > 0 && (
            <section className="mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="font-black text-slate-950">
                    Import results
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {importResults.filter((r) => r.success).length}{" "}
                    successful ·{" "}
                    {importResults.filter((r) => !r.success).length}{" "}
                    failed
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearImport}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Clear results
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <div className="divide-y divide-slate-100">
                  {importResults.map((result, index) => (
                    <div
                      key={`${result.row}-${index}`}
                      className="flex items-start gap-3 px-5 py-3 sm:px-6"
                    >
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                          result.success
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {result.success ? "✓" : "!"}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800">
                          Row {result.row}: {result.name}
                        </p>

                        <p
                          className={`mt-0.5 text-xs ${
                            result.success
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {result.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Individual Registration Form */}
          <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-fuchsia-50 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-fuchsia-100 text-lg font-black text-fuchsia-700">
                  +
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-950 sm:text-lg">
                    Individual registration
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                    Or register one attendee manually below.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div className="space-y-5">
                {/* Full name */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Full name
                    <span className="ml-1 text-fuchsia-600">*</span>
                  </label>

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Enter full name"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                    disabled={isSubmitting || isImporting}
                    className="min-h-13 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium outline-none transition placeholder:text-slate-400 focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-50 disabled:bg-slate-100"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800"
                  >
                    Phone number

                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      Optional
                    </span>
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="e.g. 0991 234 567"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    disabled={isSubmitting || isImporting}
                    className="min-h-13 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium outline-none transition placeholder:text-slate-400 focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-50 disabled:bg-slate-100"
                  />
                </div>

                {/* Church */}
                <div>
                  <label
                    htmlFor="church"
                    className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800"
                  >
                    Church

                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      Optional
                    </span>
                  </label>

                  <input
                    id="church"
                    name="church"
                    type="text"
                    placeholder="Enter church name"
                    value={church}
                    onChange={(event) =>
                      setChurch(event.target.value)
                    }
                    disabled={isSubmitting || isImporting}
                    className="min-h-13 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium outline-none transition placeholder:text-slate-400 focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-50 disabled:bg-slate-100"
                  />
                </div>

                {/* Location */}
                <div>
                  <label
                    htmlFor="location"
                    className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800"
                  >
                    Location

                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      Optional
                    </span>
                  </label>

                  <input
                    id="location"
                    name="location"
                    type="text"
                    placeholder="City, district or area"
                    value={location}
                    onChange={(event) =>
                      setLocation(event.target.value)
                    }
                    disabled={isSubmitting || isImporting}
                    className="min-h-13 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium outline-none transition placeholder:text-slate-400 focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-50 disabled:bg-slate-100"
                  />
                </div>
              </div>

              {/* Registration number information */}
              <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-blue-600 shadow-sm">
                    #
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Registration number
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                      A unique registration number will be generated
                      automatically by the system after registration.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Link
                  href="/"
                  className="flex min-h-13 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={isSubmitting || isImporting}
                  className="min-h-13 rounded-xl bg-gradient-to-r from-fuchsia-700 via-purple-700 to-blue-700 px-7 text-sm font-black text-white shadow-md transition hover:from-fuchsia-800 hover:via-purple-800 hover:to-blue-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Registering..."
                    : "Register attendee"}
                </button>
              </div>
            </div>
          </form>

          {/* Help */}
          <section className="mt-5 rounded-3xl border border-amber-100 bg-amber-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-sm font-black text-amber-700">
                i
              </div>

              <div>
                <h3 className="text-sm font-black text-amber-950">
                  Registration desk reminder
                </h3>

                <p className="mt-1 text-xs leading-5 text-amber-800/75 sm:text-sm">
                  Register each attendee once. After successful
                  registration, you can proceed to the Check-in page
                  to record their attendance.
                </p>

                <Link
                  href="/check-in"
                  className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-white px-3.5 py-2 text-xs font-black text-blue-700 shadow-sm transition hover:bg-blue-50 sm:text-sm"
                >
                  Go to check-in →
                </Link>
              </div>
            </div>
          </section>

          {/* Footer */}
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


"use client";

import { FormEvent, useMemo, useState } from "react";

type JobStatus = "queued" | "processing" | "succeeded" | "failed";

interface JobResponse {
  id: string;
  status: JobStatus;
  statusMessage: string;
  outputReady: boolean;
  errorMessage?: string;
  warnings: Array<{
    code: string;
    message: string;
    scope?: string;
    confidence?: number;
  }>;
}

const allowedMimeType = "application/pdf";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [warnings, setWarnings] = useState<JobResponse["warnings"]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const canSubmit = useMemo(
    () => Boolean(file) && !isSubmitting && (status === null || status === "failed"),
    [file, isSubmitting, status],
  );

  async function pollJob(nextJobId: string) {
    setIsPolling(true);
    try {
      let keepPolling = true;
      while (keepPolling) {
        const response = await fetch(`/api/jobs/${nextJobId}`, { cache: "no-store" });
        const body = (await response.json()) as JobResponse;

        if (!response.ok) {
          setErrorMessage(body.errorMessage ?? "Failed to get job status.");
          setStatus("failed");
          break;
        }

        setStatus(body.status);
        setStatusMessage(body.statusMessage);
        setWarnings(body.warnings ?? []);
        setErrorMessage(body.errorMessage ?? null);

        if (body.status === "failed" || body.status === "succeeded") {
          keepPolling = false;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }
    } finally {
      setIsPolling(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setWarnings([]);
    setStatus("queued");
    setStatusMessage("Uploading and creating conversion job.");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) {
        setStatus("failed");
        setStatusMessage("Could not create conversion job.");
        setErrorMessage(body.error ?? "Upload failed.");
        return;
      }

      setJobId(body.jobId as string);
      await pollJob(body.jobId as string);
    } catch {
      setStatus("failed");
      setStatusMessage("Unexpected error while uploading.");
      setErrorMessage("Unexpected network error.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const downloadUrl = jobId ? `/api/jobs/${jobId}/download` : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">PDF to Excel Converter</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Converts mixed PDFs using a hybrid extraction pipeline with confidence warnings.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">Upload PDF</label>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              if (selected && selected.type !== allowedMimeType) {
                setFile(null);
                setErrorMessage("Only PDF files are supported.");
                return;
              }
              setFile(selected);
              setErrorMessage(null);
              setStatus(null);
              setStatusMessage("");
              setWarnings([]);
            }}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {isSubmitting ? "Submitting..." : "Convert to Excel"}
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium">Job Status</h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-200">
          <span className="font-semibold">State:</span> {status ?? "idle"}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {statusMessage || "No job started yet."}
        </p>
        {errorMessage ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-200">
            {errorMessage}
          </p>
        ) : null}
        {status === "succeeded" && downloadUrl ? (
          <a
            href={downloadUrl}
            className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Download XLSX
          </a>
        ) : null}
        {(isPolling || status === "processing" || status === "queued") && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Polling for updates...
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium">Warnings</h2>
        {warnings.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No warnings reported yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {warnings.map((warning) => (
              <li
                key={`${warning.code}-${warning.scope ?? "global"}`}
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-100"
              >
                <div className="font-semibold">{warning.code}</div>
                <div>{warning.message}</div>
                {warning.scope ? <div className="text-xs">Scope: {warning.scope}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

import { makeOutputPath, readJobRecord, updateJobRecord } from "@/lib/jobs/store";
import { logEvent } from "@/lib/observability/logger";
import { runConversionPipeline } from "@/lib/pipeline/run-conversion";

const inFlightJobs = new Set<string>();

export function enqueueJob(jobId: string) {
  if (inFlightJobs.has(jobId)) {
    return;
  }

  inFlightJobs.add(jobId);
  queueMicrotask(() => {
    void processJob(jobId).finally(() => {
      inFlightJobs.delete(jobId);
    });
  });
}

async function processJob(jobId: string) {
  const job = await readJobRecord(jobId);
  if (!job) {
    return;
  }
  if (job.status === "processing" || job.status === "succeeded") {
    return;
  }

  await updateJobRecord(jobId, {
    status: "processing",
    statusMessage: "Running hybrid extraction and reconstruction pipeline.",
  });
  logEvent("info", "job_processing_started", { jobId });

  try {
    const outputPath = makeOutputPath(jobId);
    const result = await runConversionPipeline(job.inputPath, outputPath);
    await updateJobRecord(jobId, {
      status: "succeeded",
      statusMessage: "Conversion finished.",
      outputPath,
      warnings: result.warnings,
      diagnostics: result.diagnostics,
    });
    logEvent("info", "job_processing_finished", { jobId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown conversion error";
    await updateJobRecord(jobId, {
      status: "failed",
      statusMessage: "Conversion failed.",
      errorMessage: message,
    });
    logEvent("error", "job_processing_failed", { jobId, error: message });
  }
}

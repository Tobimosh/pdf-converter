import { randomUUID } from "node:crypto";

import { appConfig } from "@/lib/config";
import { enqueueJob } from "@/lib/jobs/queue";
import {
  cleanupExpiredJobs,
  createJobRecord,
  ensureStorageReady,
  makeInputPath,
  writeInputFile,
} from "@/lib/jobs/store";
import { logEvent } from "@/lib/observability/logger";
import { checkRateLimit } from "@/lib/safety/rate-limit";
import { uploadedPdfSchema } from "@/lib/safety/validation";
import type { ConversionJobRecord } from "@/lib/pipeline/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await ensureStorageReady();
  await cleanupExpiredJobs();

  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkRateLimit(ipAddress);
  if (!limit.allowed) {
    return Response.json(
      { error: "Rate limit exceeded. Please try again shortly." },
      {
        status: 429,
        headers: {
          "x-ratelimit-reset": String(limit.resetAt),
          "x-ratelimit-remaining": String(limit.remaining),
        },
      },
    );
  }

  const formData = await request.formData();
  const uploaded = formData.get("file");
  if (!(uploaded instanceof File)) {
    return Response.json({ error: "Missing file field." }, { status: 400 });
  }

  const parsed = uploadedPdfSchema.safeParse({
    name: uploaded.name,
    type: uploaded.type,
    size: uploaded.size,
  });

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid input file.",
        details: parsed.error.flatten(),
        maxUploadBytes: appConfig.maxUploadBytes,
      },
      { status: 400 },
    );
  }

  const jobId = randomUUID();
  const inputPath = makeInputPath(jobId);
  const arrayBuffer = await uploaded.arrayBuffer();
  await writeInputFile(inputPath, Buffer.from(arrayBuffer));

  const now = new Date().toISOString();
  const jobRecord: ConversionJobRecord = {
    id: jobId,
    fileName: uploaded.name,
    mimeType: uploaded.type,
    sizeBytes: uploaded.size,
    createdAt: now,
    updatedAt: now,
    status: "queued",
    statusMessage: "Job queued for conversion.",
    inputPath,
    warnings: [],
  };
  await createJobRecord(jobRecord);
  enqueueJob(jobId);

  logEvent("info", "job_queued", {
    jobId,
    fileName: uploaded.name,
    sizeBytes: uploaded.size,
  });

  return Response.json(
    {
      jobId,
      status: jobRecord.status,
      statusMessage: jobRecord.statusMessage,
    },
    {
      status: 202,
      headers: {
        "x-ratelimit-reset": String(limit.resetAt),
        "x-ratelimit-remaining": String(limit.remaining),
      },
    },
  );
}

import { readJobRecord } from "@/lib/jobs/store";
import { enqueueJob } from "@/lib/jobs/queue";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;
  const job = await readJobRecord(id);
  if (!job) {
    return Response.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.status === "queued") {
    enqueueJob(id);
  }

  return Response.json({
    id: job.id,
    status: job.status,
    statusMessage: job.statusMessage,
    fileName: job.fileName,
    warnings: job.warnings,
    diagnostics: job.diagnostics,
    errorMessage: job.errorMessage,
    outputReady: Boolean(job.outputPath && job.status === "succeeded"),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}

import { readJobRecord, readOutputFile } from "@/lib/jobs/store";

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
  if (job.status !== "succeeded" || !job.outputPath) {
    return Response.json(
      { error: "Job is not finished yet. Download is unavailable." },
      { status: 409 },
    );
  }

  const fileBuffer = await readOutputFile(job.outputPath);
  const outputName = `${job.fileName.replace(/\.pdf$/i, "") || "converted"}.xlsx`;

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${outputName}"`,
      "cache-control": "no-store",
    },
  });
}

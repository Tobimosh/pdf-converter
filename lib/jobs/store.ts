import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { appConfig } from "@/lib/config";
import type { ConversionJobRecord, JobStatus } from "@/lib/pipeline/types";

const baseDir = path.join(/* turbopackIgnore: true */ process.cwd(), appConfig.dataDir);
const jobsDir = path.join(baseDir, "jobs");
const inputDir = path.join(baseDir, "input");
const outputDir = path.join(baseDir, "output");

export async function ensureStorageReady() {
  await Promise.all([
    mkdir(jobsDir, { recursive: true }),
    mkdir(inputDir, { recursive: true }),
    mkdir(outputDir, { recursive: true }),
  ]);
}

export function makeInputPath(jobId: string) {
  return path.join(inputDir, `${jobId}.pdf`);
}

export function makeOutputPath(jobId: string) {
  return path.join(outputDir, `${jobId}.xlsx`);
}

function getJobPath(jobId: string) {
  return path.join(jobsDir, `${jobId}.json`);
}

export async function createJobRecord(job: ConversionJobRecord) {
  await ensureStorageReady();
  await writeFile(getJobPath(job.id), JSON.stringify(job, null, 2), "utf8");
}

export async function readJobRecord(jobId: string): Promise<ConversionJobRecord | null> {
  await ensureStorageReady();
  try {
    const raw = await readFile(getJobPath(jobId), "utf8");
    return JSON.parse(raw) as ConversionJobRecord;
  } catch {
    return null;
  }
}

export async function updateJobRecord(
  jobId: string,
  patch: Partial<ConversionJobRecord> & {
    status?: JobStatus;
    statusMessage?: string;
  },
): Promise<ConversionJobRecord | null> {
  const job = await readJobRecord(jobId);
  if (!job) {
    return null;
  }

  const nextJob: ConversionJobRecord = {
    ...job,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(getJobPath(jobId), JSON.stringify(nextJob, null, 2), "utf8");
  return nextJob;
}

export async function writeInputFile(inputPath: string, data: Buffer) {
  await ensureStorageReady();
  await writeFile(inputPath, data);
}

export async function writeOutputFile(outputPath: string, data: Buffer) {
  await ensureStorageReady();
  await writeFile(outputPath, data);
}

export async function readInputFile(inputPath: string) {
  return readFile(inputPath);
}

export async function readOutputFile(outputPath: string) {
  return readFile(outputPath);
}

export async function cleanupExpiredJobs() {
  await ensureStorageReady();
  const retentionMs = appConfig.jobRetentionHours * 60 * 60 * 1000;
  const now = Date.now();
  const entries = await readdir(jobsDir);

  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.endsWith(".json")) {
        return;
      }
      const filePath = path.join(jobsDir, entry);
      const stats = await stat(filePath);
      if (now - stats.mtimeMs < retentionMs) {
        return;
      }

      const raw = await readFile(filePath, "utf8");
      const job = JSON.parse(raw) as ConversionJobRecord;
      await Promise.all([
        rm(filePath, { force: true }),
        job.inputPath ? rm(job.inputPath, { force: true }) : Promise.resolve(),
        job.outputPath ? rm(job.outputPath, { force: true }) : Promise.resolve(),
      ]);
    }),
  );
}

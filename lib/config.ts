const mb = 1024 * 1024;

export const appConfig = {
  dataDir: process.env.DATA_DIR ?? ".data",
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? "20") * mb,
  maxPages: Number(process.env.MAX_PAGES ?? "150"),
  lowConfidenceThreshold: Number(process.env.LOW_CONFIDENCE_THRESHOLD ?? "0.7"),
  jobRetentionHours: Number(process.env.JOB_RETENTION_HOURS ?? "24"),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? "60000"),
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? "12"),
};

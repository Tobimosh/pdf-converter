type Level = "info" | "warn" | "error";

interface LogMeta {
  [key: string]: unknown;
}

export function logEvent(level: Level, message: string, meta: LogMeta = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export async function measureDuration<T>(
  stage: string,
  durations: Record<string, number>,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    durations[stage] = Math.round(performance.now() - start);
  }
}

import { z } from "zod";

import { appConfig } from "@/lib/config";

export const uploadedPdfSchema = z.object({
  name: z.string().min(1),
  type: z.string().regex(/^application\/pdf$/),
  size: z.number().positive().max(appConfig.maxUploadBytes),
});

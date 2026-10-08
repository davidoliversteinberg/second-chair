import { z } from "zod";

const text = (max) => z.string().trim().min(1).max(max);
const iso = z.string().datetime({ offset: true });
export const alertSchema = z
  .object({
    id: text(120).regex(/^[a-zA-Z0-9._:-]+$/),
    revision: z.number().int().positive(),
    title: text(160),
    summary: text(4000),
    why: text(1000),
    nextStep: text(1000),
    action: z
      .object({
        label: text(80),
        url: z
          .url()
          .refine(
            (v) => new URL(v).protocol === "https:",
            "Use an HTTPS action URL",
          )
          .optional(),
        steps: z.array(text(500)).min(1).max(8),
      })
      .strict()
      .optional(),
    priority: z.enum(["urgent", "attention", "fyi"]),
    kind: z.enum(["observed", "inferred", "recommended"]),
    project: text(100),
    updatedAt: iso,
    source: z
      .object({
        label: text(200),
        url: z
          .url()
          .refine(
            (v) => new URL(v).protocol === "https:",
            "Use an HTTPS source URL",
          )
          .optional(),
      })
      .strict(),
  })
  .strict();
export const reportSchema = z
  .object({
    schemaVersion: z.literal(1),
    producer: text(80)
      .regex(/^[a-zA-Z0-9._-]+$/)
      .refine(
        (v) => !["__proto__", "prototype", "constructor"].includes(v),
        "Reserved producer name",
      ),
    checkedAt: iso,
    status: z.enum(["ok", "partial", "error"]),
    coverage: text(1000),
    alerts: z.array(alertSchema).max(100),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (new Set(r.alerts.map((a) => a.id)).size !== r.alerts.length)
      ctx.addIssue({ code: "custom", message: "Duplicate alert IDs" });
  });
export const settingsSchema = z
  .object({
    paused: z.boolean().optional(),
    notifications: z.boolean().optional(),
    showPreview: z.boolean().optional(),
    quietStart: z.number().int().min(0).max(23).optional(),
    quietEnd: z.number().int().min(0).max(23).optional(),
  })
  .strict();
export const chatSchema = z
  .object({
    chatId: z.string().uuid().optional(),
    text: text(12000),
    attachment: z
      .object({ name: text(120), text: text(30000) })
      .strict()
      .optional(),
  })
  .strict();

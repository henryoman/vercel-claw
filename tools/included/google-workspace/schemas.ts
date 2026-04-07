import { z } from "zod";

export const googleWorkspaceServices = [
  "admin-reports",
  "calendar",
  "chat",
  "classroom",
  "docs",
  "drive",
  "events",
  "forms",
  "gmail",
  "keep",
  "meet",
  "modelarmor",
  "people",
  "script",
  "sheets",
  "slides",
  "tasks",
  "workflow",
] as const;

export const googleWorkspaceServiceSchema = z.enum(googleWorkspaceServices);

export const googleWorkspaceTextCommandResultSchema = z
  .object({
    command: z.array(z.string().min(1)).min(1),
    stdout: z.string(),
    stderr: z.string(),
  })
  .strict();

export const googleWorkspaceJsonCommandResultSchema =
  googleWorkspaceTextCommandResultSchema
    .extend({
      data: z.unknown(),
    })
    .strict();

export const googleWorkspaceServiceHelpInputSchema = z
  .object({
    service: googleWorkspaceServiceSchema.describe(
      "Top-level gws service name, such as gmail, calendar, drive, or sheets.",
    ),
  })
  .strict();

export const googleWorkspaceSchemaInspectInputSchema = z
  .object({
    selector: z
      .string()
      .trim()
      .min(1)
      .regex(
        /^[a-z0-9-]+(?:\.[A-Za-z0-9]+){2,}$/,
        "Use a selector like gmail.users.messages.list or drive.files.get.",
      )
      .describe("Fully-qualified gws schema selector like gmail.users.messages.list."),
  })
  .strict();

export const googleWorkspaceGmailTriageInputSchema = z
  .object({
    max: z
      .number()
      .int()
      .positive()
      .max(100)
      .default(20)
      .describe("Maximum unread messages to include in the summary."),
    query: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Optional Gmail search query. When omitted, gws defaults to is:unread."),
    includeLabels: z
      .boolean()
      .default(false)
      .describe("Include Gmail label names in the result."),
  })
  .strict();

const calendarAgendaWindowSchema = z.enum(["default", "today", "tomorrow", "week"]);

export const googleWorkspaceCalendarAgendaInputSchema = z
  .object({
    window: calendarAgendaWindowSchema
      .default("default")
      .describe("Which built-in agenda window to use."),
    days: z
      .number()
      .int()
      .positive()
      .max(31)
      .optional()
      .describe("Custom number of days ahead to show. Use instead of today/tomorrow/week."),
    calendar: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Optional calendar name or ID filter."),
    timezone: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Optional IANA timezone override such as America/New_York."),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.days !== undefined && input.window !== "default") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use either days or a predefined window, not both.",
        path: ["days"],
      });
    }
  });

export const googleWorkspaceSheetsReadInputSchema = z
  .object({
    spreadsheetId: z
      .string()
      .trim()
      .min(1)
      .describe("The Google Sheets spreadsheet ID."),
    range: z
      .string()
      .trim()
      .min(1)
      .describe('The A1 range to read, such as "Sheet1!A1:D10".'),
  })
  .strict();

export const googleWorkspaceDriveListFilesInputSchema = z
  .object({
    pageSize: z
      .number()
      .int()
      .positive()
      .max(100)
      .default(10)
      .describe("Maximum number of files to return."),
    query: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Optional Drive q expression, for example name contains 'report'."),
    trashed: z
      .boolean()
      .default(false)
      .describe("Whether trashed files should be included."),
    fields: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Optional partial-response fields selector."),
    orderBy: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Optional Drive orderBy expression."),
  })
  .strict();

export const googleWorkspaceDocsGetDocumentInputSchema = z
  .object({
    documentId: z
      .string()
      .trim()
      .min(1)
      .describe("The Google Docs document ID to fetch."),
  })
  .strict();

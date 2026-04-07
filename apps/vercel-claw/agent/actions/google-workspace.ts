import "server-only";

import { tool, type Tool } from "ai";
import { z } from "zod";
import {
  buildGoogleWorkspaceCalendarAgendaCommand,
  buildGoogleWorkspaceCalendarInsertCommand,
  buildGoogleWorkspaceGmailForwardCommand,
  buildGoogleWorkspaceGmailReadCommand,
  buildGoogleWorkspaceGmailReplyAllCommand,
  buildGoogleWorkspaceGmailReplyCommand,
  buildGoogleWorkspaceGmailSendCommand,
  buildGoogleWorkspaceGmailTriageCommand,
  type GoogleWorkspaceCalendarAgendaInput,
  type GoogleWorkspaceCalendarInsertInput,
  type GoogleWorkspaceGmailForwardInput,
  type GoogleWorkspaceGmailReadInput,
  type GoogleWorkspaceGmailReplyAllInput,
  type GoogleWorkspaceGmailReplyInput,
  type GoogleWorkspaceGmailSendInput,
  type GoogleWorkspaceGmailTriageInput,
} from "../../../../tools/included/google-workspace/code/commands";
import { runGoogleWorkspaceCommand } from "../../../../tools/included/google-workspace/code/runner";

const GOOGLE_WORKSPACE_TOOL_ID = "google-workspace";
const emailAddressSchema = z.string().trim().email();
const emailListSchema = z.array(emailAddressSchema).min(1);
const optionalEmailListSchema = emailListSchema.optional();
const attachmentPathListSchema = z.array(z.string().trim().min(1)).min(1).optional();
const dateTimeSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    "Use an ISO 8601 / RFC3339 datetime like 2026-04-06T13:00:00-07:00.",
  );

const googleWorkspaceTextCommandResultSchema = z
  .object({
    command: z.array(z.string().min(1)).min(1),
    stdout: z.string(),
    stderr: z.string(),
  })
  .strict();

const googleWorkspaceStructuredCommandResultSchema = googleWorkspaceTextCommandResultSchema
  .extend({
    format: z.enum(["json", "text"]),
    data: z.unknown().nullable(),
  })
  .strict();

const googleWorkspaceGmailTriageInputSchema = z
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

const googleWorkspaceGmailSendInputSchema = z
  .object({
    to: emailListSchema.describe("Recipient email addresses."),
    subject: z.string().trim().min(1).describe("Email subject line."),
    body: z.string().min(1).describe("Email body text or HTML fragment."),
    from: emailAddressSchema.optional().describe("Optional send-as alias address."),
    cc: optionalEmailListSchema.describe("Optional CC recipients."),
    bcc: optionalEmailListSchema.describe("Optional BCC recipients."),
    attachments: attachmentPathListSchema.describe("Optional attachment file paths."),
    html: z.boolean().default(false).describe("Treat `body` as HTML."),
    dryRun: z.boolean().default(false).describe("Validate the send without executing it."),
    draft: z.boolean().default(false).describe("Create a draft instead of sending immediately."),
  })
  .strict();

const googleWorkspaceGmailReplyInputSchema = z
  .object({
    messageId: z.string().trim().min(1).describe("Gmail message ID to reply to."),
    body: z.string().min(1).describe("Reply body text or HTML fragment."),
    from: emailAddressSchema.optional().describe("Optional send-as alias address."),
    to: optionalEmailListSchema.describe("Optional extra To recipients."),
    cc: optionalEmailListSchema.describe("Optional CC recipients."),
    bcc: optionalEmailListSchema.describe("Optional BCC recipients."),
    attachments: attachmentPathListSchema.describe("Optional attachment file paths."),
    html: z.boolean().default(false).describe("Treat `body` as HTML."),
    dryRun: z.boolean().default(false).describe("Validate the reply without executing it."),
    draft: z.boolean().default(false).describe("Create a draft reply instead of sending."),
  })
  .strict();

const googleWorkspaceGmailReplyAllInputSchema = z
  .object({
    messageId: z.string().trim().min(1).describe("Gmail message ID to reply-all to."),
    body: z.string().min(1).describe("Reply body text or HTML fragment."),
    from: emailAddressSchema.optional().describe("Optional send-as alias address."),
    to: optionalEmailListSchema.describe("Optional extra To recipients."),
    cc: optionalEmailListSchema.describe("Optional CC recipients."),
    bcc: optionalEmailListSchema.describe("Optional BCC recipients."),
    remove: optionalEmailListSchema.describe("Recipients to exclude from the reply-all."),
    attachments: attachmentPathListSchema.describe("Optional attachment file paths."),
    html: z.boolean().default(false).describe("Treat `body` as HTML."),
    dryRun: z.boolean().default(false).describe("Validate the reply-all without executing it."),
    draft: z.boolean().default(false).describe("Create a draft reply-all instead of sending."),
  })
  .strict();

const googleWorkspaceGmailForwardInputSchema = z
  .object({
    messageId: z.string().trim().min(1).describe("Gmail message ID to forward."),
    to: emailListSchema.describe("Recipient email addresses."),
    from: emailAddressSchema.optional().describe("Optional send-as alias address."),
    body: z.string().min(1).optional().describe("Optional note to prepend above the forwarded message."),
    cc: optionalEmailListSchema.describe("Optional CC recipients."),
    bcc: optionalEmailListSchema.describe("Optional BCC recipients."),
    attachments: attachmentPathListSchema.describe("Optional additional attachment file paths."),
    html: z.boolean().default(false).describe("Treat `body` as HTML."),
    dryRun: z.boolean().default(false).describe("Validate the forward without executing it."),
    draft: z.boolean().default(false).describe("Create a draft forward instead of sending."),
    includeOriginalAttachments: z
      .boolean()
      .default(true)
      .describe("Include the original message attachments when forwarding."),
  })
  .strict();

const googleWorkspaceGmailReadInputSchema = z
  .object({
    id: z.string().trim().min(1).describe("Gmail message ID to read."),
    headers: z.boolean().default(false).describe("Include From, To, Subject, and Date headers."),
    html: z.boolean().default(false).describe("Return HTML body instead of plain text."),
  })
  .strict();

const googleWorkspaceCalendarAgendaInputSchema = z
  .object({
    window: z
      .enum(["default", "today", "tomorrow", "week"])
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

const googleWorkspaceCalendarInsertInputSchema = z
  .object({
    calendar: z.string().trim().min(1).optional().describe("Optional calendar ID. Defaults to primary."),
    summary: z.string().trim().min(1).describe("Event title / summary."),
    start: dateTimeSchema.describe("Event start time in RFC3339 format."),
    end: dateTimeSchema.describe("Event end time in RFC3339 format."),
    location: z.string().trim().min(1).optional().describe("Optional event location."),
    description: z.string().min(1).optional().describe("Optional event description/body."),
    attendees: optionalEmailListSchema.describe("Optional attendee email addresses."),
    meet: z.boolean().default(false).describe("Add a Google Meet link."),
    dryRun: z.boolean().default(false).describe("Validate the event creation without executing it."),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (Date.parse(input.end) <= Date.parse(input.start)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time.",
        path: ["end"],
      });
    }
  });

const googleWorkspaceGmailTriageResultSchema = googleWorkspaceStructuredCommandResultSchema
  .extend({
    max: z.number().int().positive().max(100),
    query: z.string().min(1).nullable(),
    includeLabels: z.boolean(),
  })
  .strict();

const googleWorkspaceGmailSendResultSchema = googleWorkspaceStructuredCommandResultSchema
  .extend({
    to: z.array(z.string().email()).min(1),
    subject: z.string().min(1),
    draft: z.boolean(),
    dryRun: z.boolean(),
  })
  .strict();

const googleWorkspaceGmailReplyResultSchema = googleWorkspaceStructuredCommandResultSchema
  .extend({
    messageId: z.string().min(1),
    draft: z.boolean(),
    dryRun: z.boolean(),
  })
  .strict();

const googleWorkspaceGmailReplyAllResultSchema = googleWorkspaceStructuredCommandResultSchema
  .extend({
    messageId: z.string().min(1),
    draft: z.boolean(),
    dryRun: z.boolean(),
  })
  .strict();

const googleWorkspaceGmailForwardResultSchema = googleWorkspaceStructuredCommandResultSchema
  .extend({
    messageId: z.string().min(1),
    to: z.array(z.string().email()).min(1),
    draft: z.boolean(),
    dryRun: z.boolean(),
    includeOriginalAttachments: z.boolean(),
  })
  .strict();

const googleWorkspaceGmailReadResultSchema = googleWorkspaceStructuredCommandResultSchema
  .extend({
    id: z.string().min(1),
    headers: z.boolean(),
    html: z.boolean(),
  })
  .strict();

const googleWorkspaceCalendarAgendaResultSchema = googleWorkspaceStructuredCommandResultSchema
  .extend({
    window: z.enum(["default", "today", "tomorrow", "week"]),
    days: z.number().int().positive().max(31).nullable(),
    calendar: z.string().min(1).nullable(),
    timezone: z.string().min(1).nullable(),
  })
  .strict();

const googleWorkspaceCalendarInsertResultSchema = googleWorkspaceStructuredCommandResultSchema
  .extend({
    summary: z.string().min(1),
    start: z.string().min(1),
    end: z.string().min(1),
    calendar: z.string().min(1).nullable(),
    meet: z.boolean(),
    dryRun: z.boolean(),
  })
  .strict();

function isGoogleWorkspaceExposed(exposedToolIds: string[]) {
  return exposedToolIds.includes(GOOGLE_WORKSPACE_TOOL_ID);
}

export function createGoogleWorkspaceTools(options: { exposedToolIds?: string[] } = {}) {
  const exposedToolIds = options.exposedToolIds ?? [];
  if (!isGoogleWorkspaceExposed(exposedToolIds)) {
    return {};
  }

  const tools: Record<string, Tool> = {
    google_workspace_gmail_send: tool({
      description:
        "Send an email with `gws gmail +send`. This is a write operation, so use `dryRun` or `draft` unless the user explicitly wants it sent now.",
      inputSchema: googleWorkspaceGmailSendInputSchema,
      outputSchema: googleWorkspaceGmailSendResultSchema,
      execute: async (input: GoogleWorkspaceGmailSendInput) => {
        const result = await runGoogleWorkspaceCommand(buildGoogleWorkspaceGmailSendCommand(input));
        return googleWorkspaceGmailSendResultSchema.parse({
          command: result.command,
          stdout: result.stdout,
          stderr: result.stderr,
          format: result.format,
          data: result.data,
          to: input.to,
          subject: input.subject,
          draft: input.draft,
          dryRun: input.dryRun,
        });
      },
    }),
    google_workspace_gmail_reply: tool({
      description:
        "Reply to a Gmail message with `gws gmail +reply`. This is a write operation, so use `dryRun` or `draft` unless the user explicitly wants it sent now.",
      inputSchema: googleWorkspaceGmailReplyInputSchema,
      outputSchema: googleWorkspaceGmailReplyResultSchema,
      execute: async (input: GoogleWorkspaceGmailReplyInput) => {
        const result = await runGoogleWorkspaceCommand(buildGoogleWorkspaceGmailReplyCommand(input));
        return googleWorkspaceGmailReplyResultSchema.parse({
          command: result.command,
          stdout: result.stdout,
          stderr: result.stderr,
          format: result.format,
          data: result.data,
          messageId: input.messageId,
          draft: input.draft,
          dryRun: input.dryRun,
        });
      },
    }),
    google_workspace_gmail_reply_all: tool({
      description:
        "Reply-all to a Gmail message with `gws gmail +reply-all`. This is a write operation, so use `dryRun` or `draft` unless the user explicitly wants it sent now.",
      inputSchema: googleWorkspaceGmailReplyAllInputSchema,
      outputSchema: googleWorkspaceGmailReplyAllResultSchema,
      execute: async (input: GoogleWorkspaceGmailReplyAllInput) => {
        const result = await runGoogleWorkspaceCommand(buildGoogleWorkspaceGmailReplyAllCommand(input));
        return googleWorkspaceGmailReplyAllResultSchema.parse({
          command: result.command,
          stdout: result.stdout,
          stderr: result.stderr,
          format: result.format,
          data: result.data,
          messageId: input.messageId,
          draft: input.draft,
          dryRun: input.dryRun,
        });
      },
    }),
    google_workspace_gmail_forward: tool({
      description:
        "Forward a Gmail message with `gws gmail +forward`. This is a write operation, so use `dryRun` or `draft` unless the user explicitly wants it sent now.",
      inputSchema: googleWorkspaceGmailForwardInputSchema,
      outputSchema: googleWorkspaceGmailForwardResultSchema,
      execute: async (input: GoogleWorkspaceGmailForwardInput) => {
        const result = await runGoogleWorkspaceCommand(
          buildGoogleWorkspaceGmailForwardCommand(input),
        );
        return googleWorkspaceGmailForwardResultSchema.parse({
          command: result.command,
          stdout: result.stdout,
          stderr: result.stderr,
          format: result.format,
          data: result.data,
          messageId: input.messageId,
          to: input.to,
          draft: input.draft,
          dryRun: input.dryRun,
          includeOriginalAttachments: input.includeOriginalAttachments,
        });
      },
    }),
    google_workspace_gmail_read: tool({
      description:
        "Read a Gmail message body and optional headers with `gws gmail +read`.",
      inputSchema: googleWorkspaceGmailReadInputSchema,
      outputSchema: googleWorkspaceGmailReadResultSchema,
      execute: async (input: GoogleWorkspaceGmailReadInput) => {
        const result = await runGoogleWorkspaceCommand(buildGoogleWorkspaceGmailReadCommand(input));
        return googleWorkspaceGmailReadResultSchema.parse({
          command: result.command,
          stdout: result.stdout,
          stderr: result.stderr,
          format: result.format,
          data: result.data,
          id: input.id,
          headers: input.headers,
          html: input.html,
        });
      },
    }),
    google_workspace_gmail_triage: tool({
      description:
        "Return an unread inbox summary through `gws gmail +triage`, optionally filtered by a Gmail search query.",
      inputSchema: googleWorkspaceGmailTriageInputSchema,
      outputSchema: googleWorkspaceGmailTriageResultSchema,
      execute: async (input: GoogleWorkspaceGmailTriageInput) => {
        const result = await runGoogleWorkspaceCommand(buildGoogleWorkspaceGmailTriageCommand(input));
        return googleWorkspaceGmailTriageResultSchema.parse({
          command: result.command,
          stdout: result.stdout,
          stderr: result.stderr,
          format: result.format,
          data: result.data,
          max: input.max,
          query: input.query ?? null,
          includeLabels: input.includeLabels,
        });
      },
    }),
    google_workspace_calendar_agenda: tool({
      description:
        "List upcoming Google Calendar events with `gws calendar +agenda` using a built-in window or custom day count.",
      inputSchema: googleWorkspaceCalendarAgendaInputSchema,
      outputSchema: googleWorkspaceCalendarAgendaResultSchema,
      execute: async (input: GoogleWorkspaceCalendarAgendaInput) => {
        const result = await runGoogleWorkspaceCommand(
          buildGoogleWorkspaceCalendarAgendaCommand(input),
        );
        return googleWorkspaceCalendarAgendaResultSchema.parse({
          command: result.command,
          stdout: result.stdout,
          stderr: result.stderr,
          format: result.format,
          data: result.data,
          window: input.window,
          days: input.days ?? null,
          calendar: input.calendar ?? null,
          timezone: input.timezone ?? null,
        });
      },
    }),
    google_workspace_calendar_insert: tool({
      description:
        "Create a Google Calendar event with `gws calendar +insert`. This is a write operation, so use `dryRun` unless the user explicitly wants the event created now.",
      inputSchema: googleWorkspaceCalendarInsertInputSchema,
      outputSchema: googleWorkspaceCalendarInsertResultSchema,
      execute: async (input: GoogleWorkspaceCalendarInsertInput) => {
        const result = await runGoogleWorkspaceCommand(
          buildGoogleWorkspaceCalendarInsertCommand(input),
        );
        return googleWorkspaceCalendarInsertResultSchema.parse({
          command: result.command,
          stdout: result.stdout,
          stderr: result.stderr,
          format: result.format,
          data: result.data,
          summary: input.summary,
          start: input.start,
          end: input.end,
          calendar: input.calendar ?? null,
          meet: input.meet,
          dryRun: input.dryRun,
        });
      },
    }),
  };

  return tools;
}

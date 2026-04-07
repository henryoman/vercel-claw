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

export type GoogleWorkspaceCalendarAgendaWindow = "default" | "today" | "tomorrow" | "week";

export interface GoogleWorkspaceGmailTriageInput {
  readonly max: number;
  readonly query?: string;
  readonly includeLabels: boolean;
}

export interface GoogleWorkspaceGmailSendInput {
  readonly to: string[];
  readonly subject: string;
  readonly body: string;
  readonly from?: string;
  readonly cc?: string[];
  readonly bcc?: string[];
  readonly attachments?: string[];
  readonly html: boolean;
  readonly dryRun: boolean;
  readonly draft: boolean;
}

export interface GoogleWorkspaceGmailReplyInput {
  readonly messageId: string;
  readonly body: string;
  readonly from?: string;
  readonly to?: string[];
  readonly cc?: string[];
  readonly bcc?: string[];
  readonly attachments?: string[];
  readonly html: boolean;
  readonly dryRun: boolean;
  readonly draft: boolean;
}

export interface GoogleWorkspaceGmailReplyAllInput {
  readonly messageId: string;
  readonly body: string;
  readonly from?: string;
  readonly to?: string[];
  readonly cc?: string[];
  readonly bcc?: string[];
  readonly attachments?: string[];
  readonly remove?: string[];
  readonly html: boolean;
  readonly dryRun: boolean;
  readonly draft: boolean;
}

export interface GoogleWorkspaceGmailForwardInput {
  readonly messageId: string;
  readonly to: string[];
  readonly from?: string;
  readonly body?: string;
  readonly cc?: string[];
  readonly bcc?: string[];
  readonly attachments?: string[];
  readonly html: boolean;
  readonly dryRun: boolean;
  readonly draft: boolean;
  readonly includeOriginalAttachments: boolean;
}

export interface GoogleWorkspaceGmailReadInput {
  readonly id: string;
  readonly headers: boolean;
  readonly html: boolean;
}

export interface GoogleWorkspaceCalendarAgendaInput {
  readonly window: GoogleWorkspaceCalendarAgendaWindow;
  readonly days?: number;
  readonly calendar?: string;
  readonly timezone?: string;
}

export interface GoogleWorkspaceCalendarInsertInput {
  readonly calendar?: string;
  readonly summary: string;
  readonly start: string;
  readonly end: string;
  readonly location?: string;
  readonly description?: string;
  readonly attendees?: string[];
  readonly meet: boolean;
  readonly dryRun: boolean;
}

export interface GoogleWorkspaceCommandRequest {
  readonly args: string[];
  readonly expectJson: boolean;
}

export function buildGoogleWorkspaceGmailTriageCommand(
  input: GoogleWorkspaceGmailTriageInput,
): GoogleWorkspaceCommandRequest {
  const args = ["gmail", "+triage", "--max", String(input.max), "--format", "json"];

  if (input.query) {
    args.push("--query", input.query);
  }

  if (input.includeLabels) {
    args.push("--include-labels");
  }

  return {
    args,
    expectJson: true,
  };
}

export function buildGoogleWorkspaceGmailSendCommand(
  input: GoogleWorkspaceGmailSendInput,
): GoogleWorkspaceCommandRequest {
  const args = [
    "gmail",
    "+send",
    "--to",
    joinCsv(input.to),
    "--subject",
    input.subject,
    "--body",
    input.body,
    "--format",
    "json",
  ];

  appendOptionalValue(args, "--from", input.from);
  appendOptionalCsv(args, "--cc", input.cc);
  appendOptionalCsv(args, "--bcc", input.bcc);
  appendRepeatedValues(args, "--attach", input.attachments);
  appendBooleanFlag(args, "--html", input.html);
  appendBooleanFlag(args, "--dry-run", input.dryRun);
  appendBooleanFlag(args, "--draft", input.draft);

  return {
    args,
    expectJson: true,
  };
}

export function buildGoogleWorkspaceGmailReplyCommand(
  input: GoogleWorkspaceGmailReplyInput,
): GoogleWorkspaceCommandRequest {
  const args = [
    "gmail",
    "+reply",
    "--message-id",
    input.messageId,
    "--body",
    input.body,
    "--format",
    "json",
  ];

  appendOptionalValue(args, "--from", input.from);
  appendOptionalCsv(args, "--to", input.to);
  appendOptionalCsv(args, "--cc", input.cc);
  appendOptionalCsv(args, "--bcc", input.bcc);
  appendRepeatedValues(args, "--attach", input.attachments);
  appendBooleanFlag(args, "--html", input.html);
  appendBooleanFlag(args, "--dry-run", input.dryRun);
  appendBooleanFlag(args, "--draft", input.draft);

  return {
    args,
    expectJson: true,
  };
}

export function buildGoogleWorkspaceGmailReplyAllCommand(
  input: GoogleWorkspaceGmailReplyAllInput,
): GoogleWorkspaceCommandRequest {
  const args = [
    "gmail",
    "+reply-all",
    "--message-id",
    input.messageId,
    "--body",
    input.body,
    "--format",
    "json",
  ];

  appendOptionalValue(args, "--from", input.from);
  appendOptionalCsv(args, "--to", input.to);
  appendOptionalCsv(args, "--cc", input.cc);
  appendOptionalCsv(args, "--bcc", input.bcc);
  appendOptionalCsv(args, "--remove", input.remove);
  appendRepeatedValues(args, "--attach", input.attachments);
  appendBooleanFlag(args, "--html", input.html);
  appendBooleanFlag(args, "--dry-run", input.dryRun);
  appendBooleanFlag(args, "--draft", input.draft);

  return {
    args,
    expectJson: true,
  };
}

export function buildGoogleWorkspaceGmailForwardCommand(
  input: GoogleWorkspaceGmailForwardInput,
): GoogleWorkspaceCommandRequest {
  const args = [
    "gmail",
    "+forward",
    "--message-id",
    input.messageId,
    "--to",
    joinCsv(input.to),
    "--format",
    "json",
  ];

  appendOptionalValue(args, "--from", input.from);
  appendOptionalValue(args, "--body", input.body);
  appendOptionalCsv(args, "--cc", input.cc);
  appendOptionalCsv(args, "--bcc", input.bcc);
  appendRepeatedValues(args, "--attach", input.attachments);
  appendBooleanFlag(args, "--html", input.html);
  appendBooleanFlag(args, "--dry-run", input.dryRun);
  appendBooleanFlag(args, "--draft", input.draft);
  appendBooleanFlag(args, "--no-original-attachments", !input.includeOriginalAttachments);

  return {
    args,
    expectJson: true,
  };
}

export function buildGoogleWorkspaceGmailReadCommand(
  input: GoogleWorkspaceGmailReadInput,
): GoogleWorkspaceCommandRequest {
  const args = ["gmail", "+read", "--id", input.id, "--format", "json"];

  appendBooleanFlag(args, "--headers", input.headers);
  appendBooleanFlag(args, "--html", input.html);

  return {
    args,
    expectJson: true,
  };
}

export function buildGoogleWorkspaceCalendarAgendaCommand(
  input: GoogleWorkspaceCalendarAgendaInput,
): GoogleWorkspaceCommandRequest {
  const args = ["calendar", "+agenda", "--format", "json"];

  if (input.window === "today") {
    args.push("--today");
  } else if (input.window === "tomorrow") {
    args.push("--tomorrow");
  } else if (input.window === "week") {
    args.push("--week");
  }

  if (input.days !== undefined) {
    args.push("--days", String(input.days));
  }

  if (input.calendar) {
    args.push("--calendar", input.calendar);
  }

  if (input.timezone) {
    args.push("--timezone", input.timezone);
  }

  return {
    args,
    expectJson: true,
  };
}

export function buildGoogleWorkspaceCalendarInsertCommand(
  input: GoogleWorkspaceCalendarInsertInput,
): GoogleWorkspaceCommandRequest {
  const args = [
    "calendar",
    "+insert",
    "--summary",
    input.summary,
    "--start",
    input.start,
    "--end",
    input.end,
    "--format",
    "json",
  ];

  appendOptionalValue(args, "--calendar", input.calendar);
  appendOptionalValue(args, "--location", input.location);
  appendOptionalValue(args, "--description", input.description);
  appendRepeatedValues(args, "--attendee", input.attendees);
  appendBooleanFlag(args, "--meet", input.meet);
  appendBooleanFlag(args, "--dry-run", input.dryRun);

  return {
    args,
    expectJson: true,
  };
}

function appendBooleanFlag(args: string[], flag: string, enabled: boolean) {
  if (enabled) {
    args.push(flag);
  }
}

function appendOptionalValue(args: string[], flag: string, value: string | undefined) {
  if (value) {
    args.push(flag, value);
  }
}

function appendOptionalCsv(args: string[], flag: string, values: string[] | undefined) {
  if (values && values.length > 0) {
    args.push(flag, joinCsv(values));
  }
}

function appendRepeatedValues(args: string[], flag: string, values: string[] | undefined) {
  for (const value of values ?? []) {
    args.push(flag, value);
  }
}

function joinCsv(values: string[]) {
  return values.join(",");
}

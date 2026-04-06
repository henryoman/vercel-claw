import { getTimeZone } from "./getTimeZone";

export interface GetCurrentTimeOptions {
  locale?: string | null;
  now?: Date | number | string;
  timeZone?: string | null;
}

export interface CurrentTimeContext {
  date: string;
  dateTime: string;
  iso8601: string;
  locale: string;
  time: string;
  timeZone: string;
  unixMs: number;
}

const DEFAULT_LOCALE = "en-US";

export function getCurrentTime(options: GetCurrentTimeOptions = {}): CurrentTimeContext {
  const now = resolveNow(options.now);
  const locale = normalizeLocale(options.locale) ?? DEFAULT_LOCALE;
  const timeZone = getTimeZone({
    locale,
    timeZone: options.timeZone,
  });

  return {
    date: formatDate(now, locale, timeZone, "long"),
    dateTime: formatDateTime(now, locale, timeZone),
    iso8601: now.toISOString(),
    locale,
    time: formatTime(now, locale, timeZone),
    timeZone,
    unixMs: now.getTime(),
  };
}

export function formatCurrentTimeForPrompt(options: GetCurrentTimeOptions = {}) {
  const context = getCurrentTime(options);
  return `Current time: ${context.dateTime} (${context.timeZone}, ${context.iso8601})`;
}

function resolveNow(value: Date | number | string | undefined) {
  if (value === undefined) {
    return new Date();
  }

  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : typeof value === "number"
        ? new Date(value)
        : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid time value passed to getCurrentTime.");
  }

  return date;
}

function formatDate(date: Date, locale: string, timeZone: string, dateStyle: "full" | "long") {
  return new Intl.DateTimeFormat(locale, {
    dateStyle,
    timeZone,
  }).format(date);
}

function formatTime(date: Date, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(locale, {
    timeStyle: "long",
    timeZone,
  }).format(date);
}

function formatDateTime(date: Date, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "long",
    timeZone,
  }).format(date);
}

function normalizeLocale(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

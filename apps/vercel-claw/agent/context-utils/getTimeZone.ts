export interface GetTimeZoneOptions {
  locale?: string | null;
  fallback?: string | null;
  timeZone?: string | null;
}

export const DEFAULT_TIME_ZONE = "UTC";

export function getTimeZone(options: GetTimeZoneOptions = {}) {
  return (
    normalizeTimeZone(options.timeZone) ??
    resolveTimeZoneFromLocale(options.locale) ??
    resolveRuntimeTimeZone() ??
    normalizeTimeZone(options.fallback) ??
    DEFAULT_TIME_ZONE
  );
}

function resolveTimeZoneFromLocale(locale: string | null | undefined) {
  const normalizedLocale = normalizeLocale(locale);
  if (!normalizedLocale) {
    return null;
  }

  try {
    return normalizeTimeZone(new Intl.DateTimeFormat(normalizedLocale).resolvedOptions().timeZone);
  } catch {
    return null;
  }
}

function resolveRuntimeTimeZone() {
  try {
    return normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return null;
  }
}

function normalizeLocale(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeTimeZone(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export interface GetLocationOptions {
  city?: string | null;
  country?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  locale?: string | null;
  longitude?: number | null;
  region?: string | null;
  timeZone?: string | null;
}

export interface LocationContext {
  city: string | null;
  country: string | null;
  countryCode: string | null;
  inferred: boolean;
  label: string;
  latitude: number | null;
  longitude: number | null;
  region: string | null;
  timeZone: string | null;
}

export function getLocation(options: GetLocationOptions = {}): LocationContext | null {
  const city = normalizeText(options.city);
  const region = normalizeText(options.region);
  const country = normalizeText(options.country);
  const countryCode = normalizeCountryCode(options.countryCode) ?? getCountryCodeFromLocale(options.locale);
  const latitude = normalizeCoordinate(options.latitude);
  const longitude = normalizeCoordinate(options.longitude);
  const timeZone = normalizeText(options.timeZone);
  const inferred = normalizeCountryCode(options.countryCode) === null && countryCode !== null;
  const label = [city, region, country ?? countryCode].filter((value): value is string => value !== null).join(", ");

  if (!label && latitude === null && longitude === null && timeZone === null) {
    return null;
  }

  return {
    city,
    country,
    countryCode,
    inferred,
    label: label || buildFallbackLabel(latitude, longitude, timeZone),
    latitude,
    longitude,
    region,
    timeZone,
  };
}

export function formatLocationForPrompt(options: GetLocationOptions = {}) {
  const location = getLocation(options);
  if (!location) {
    return null;
  }

  const lines = [`Location: ${location.label}`];

  if (location.timeZone) {
    lines.push(`Location time zone: ${location.timeZone}`);
  }

  if (location.latitude !== null && location.longitude !== null) {
    lines.push(`Coordinates: ${location.latitude}, ${location.longitude}`);
  }

  if (location.inferred) {
    lines.push("Location metadata includes inferred values from locale information.");
  }

  return lines.join("\n");
}

function getCountryCodeFromLocale(locale: string | null | undefined) {
  const normalizedLocale = normalizeText(locale);
  if (!normalizedLocale) {
    return null;
  }

  try {
    const region = new Intl.Locale(normalizedLocale).region;
    return normalizeCountryCode(region);
  } catch {
    const match = normalizedLocale.match(/[-_]([a-zA-Z]{2}|\d{3})(?:[-_]|$)/);
    return normalizeCountryCode(match?.[1] ?? null);
  }
}

function buildFallbackLabel(
  latitude: number | null,
  longitude: number | null,
  timeZone: string | null,
) {
  if (latitude !== null && longitude !== null) {
    return `${latitude}, ${longitude}`;
  }

  if (timeZone !== null) {
    return timeZone;
  }

  return "Unknown";
}

function normalizeCoordinate(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function normalizeCountryCode(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return normalized ? normalized.toUpperCase() : null;
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

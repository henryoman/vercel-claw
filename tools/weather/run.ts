#!/usr/bin/env bun

import { $ } from "bun";

type WttrValue = {
  value?: string;
};

type WttrCurrentCondition = {
  FeelsLikeC?: string;
  cloudcover?: string;
  humidity?: string;
  observation_time?: string;
  precipMM?: string;
  temp_C?: string;
  visibility?: string;
  weatherDesc?: WttrValue[];
  winddir16Point?: string;
  windspeedKmph?: string;
};

type WttrArea = {
  areaName?: WttrValue[];
  country?: WttrValue[];
  region?: WttrValue[];
};

type WttrForecastDay = {
  maxtempC?: string;
  mintempC?: string;
};

type WttrPayload = {
  current_condition?: WttrCurrentCondition[];
  nearest_area?: WttrArea[];
  weather?: WttrForecastDay[];
};

type WttrResponse = WttrPayload & {
  data?: WttrPayload;
};

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function getText(values?: WttrValue[]) {
  return values?.[0]?.value?.trim() || null;
}

function toNumber(value?: string) {
  if (!value) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeLocation(rawLocation: string) {
  const normalized = rawLocation.trim().replace(/\s+/g, " ");

  if (normalized.length === 0) {
    fail('Usage: bun "tools/weather/run.ts" "<location>"');
  }

  if (normalized.length > 120) {
    fail("Location must be 120 characters or fewer.");
  }

  if (/[\r\n]/.test(normalized)) {
    fail("Location must be a single line.");
  }

  return normalized;
}

function buildResolvedLocation(area: WttrArea | undefined, requestedLocation: string) {
  const city = getText(area?.areaName);
  const region = getText(area?.region);
  const country = getText(area?.country);
  return [city, region, country].filter(Boolean).join(", ") || requestedLocation;
}

const requestedLocation = normalizeLocation(Bun.argv[2] ?? "");
const encodedLocation = encodeURIComponent(requestedLocation).replace(/%20/g, "+");
const url = `https://wttr.in/${encodedLocation}?format=j2&m&lang=en`;

const responseText = await $`curl --fail --silent --show-error --location --max-time 10 --retry 2 --retry-all-errors --user-agent vercel-claw-weather/0.1 ${url}`.text();

let response: WttrResponse;

try {
  response = JSON.parse(responseText) as WttrResponse;
} catch {
  fail("Weather provider returned invalid JSON.");
}

const payload = response.data ?? response;

const current = payload.current_condition?.[0];
const area = payload.nearest_area?.[0];
const today = payload.weather?.[0];

if (!current) {
  fail("Weather provider returned no current conditions.");
}

const result = {
  requestedLocation,
  resolvedLocation: buildResolvedLocation(area, requestedLocation),
  region: getText(area?.region),
  country: getText(area?.country),
  condition: getText(current.weatherDesc),
  temperatureC: toNumber(current.temp_C),
  feelsLikeC: toNumber(current.FeelsLikeC),
  humidityPercent: toNumber(current.humidity),
  precipitationMm: toNumber(current.precipMM),
  visibilityKm: toNumber(current.visibility),
  windKph: toNumber(current.windspeedKmph),
  windDirection16Point: current.winddir16Point ?? null,
  cloudCoverPercent: toNumber(current.cloudcover),
  observationTime: current.observation_time ?? null,
  todayMinC: toNumber(today?.mintempC),
  todayMaxC: toNumber(today?.maxtempC),
};

console.log(JSON.stringify(result, null, 2));

import "server-only";

const DEFAULT_POSTHOG_HOST = "https://us.posthog.com";
const DEFAULT_REQUEST_TIMEOUT_MS = 100_000;

export interface PostHogServerConfig {
  readonly host: string;
  readonly projectId: string | null;
  readonly personalApiKey: string | null;
  readonly requestTimeoutMs: number;
  readonly enableLogs: boolean;
  readonly enableFlags: boolean;
  readonly enableExperiments: boolean;
}

export interface PostHogCapabilitySnapshot {
  readonly hasApiKey: boolean;
  readonly hasProjectId: boolean;
  readonly canReadInsights: boolean;
  readonly canReadErrors: boolean;
  readonly canReadLogs: boolean;
  readonly canReadFlags: boolean;
  readonly canReadExperiments: boolean;
}

export function getPostHogConfig(): PostHogServerConfig {
  return {
    host: normalizeHost(process.env.POSTHOG_HOST, DEFAULT_POSTHOG_HOST),
    projectId: readOptionalString(process.env.POSTHOG_PROJECT_ID),
    personalApiKey: readOptionalString(process.env.POSTHOG_API_KEY),
    requestTimeoutMs: Math.max(1_000, readInteger(process.env.POSTHOG_REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS)),
    enableLogs: readBoolean(process.env.POSTHOG_ENABLE_LOGS, false),
    enableFlags: readBoolean(process.env.POSTHOG_ENABLE_FLAGS, false),
    enableExperiments: readBoolean(process.env.POSTHOG_ENABLE_EXPERIMENTS, false),
  };
}

export function getPostHogCapabilities(config: PostHogServerConfig): PostHogCapabilitySnapshot {
  const hasApiKey = Boolean(config.personalApiKey);
  const hasProjectId = Boolean(config.projectId);
  const hasProjectScope = hasApiKey && hasProjectId;

  return {
    hasApiKey,
    hasProjectId,
    canReadInsights: hasProjectScope,
    canReadErrors: hasProjectScope,
    canReadLogs: hasProjectScope && config.enableLogs,
    canReadFlags: hasProjectScope && config.enableFlags,
    canReadExperiments: hasProjectScope && config.enableExperiments,
  };
}

function normalizeHost(value: string | undefined, fallback: string) {
  const raw = readOptionalString(value) ?? fallback;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function readOptionalString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function readBoolean(value: string | undefined, fallback: boolean) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function readInteger(value: string | undefined, fallback: number) {
  const normalized = value?.trim();
  if (!normalized) {
    return fallback;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

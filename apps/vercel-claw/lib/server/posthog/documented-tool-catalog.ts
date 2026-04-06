import "server-only";

export interface PostHogDocumentedTool {
  readonly name: string;
  readonly purpose: string;
}

export interface PostHogDocumentedFeatureCatalog {
  readonly feature: string;
  readonly title: string;
  readonly description: string;
  readonly docsUrl: string | null;
  readonly priority: "core" | "high";
  readonly tools: readonly PostHogDocumentedTool[];
}

export interface PostHogDocumentedToolCatalog {
  readonly verifiedAt: string;
  readonly sources: readonly string[];
  readonly serverUrls: {
    readonly us: string;
    readonly eu: string;
  };
  readonly pinning: {
    readonly supportedHeaders: readonly string[];
    readonly supportedQueryParameters: readonly string[];
  };
  readonly featureFilterExample: string;
  readonly recommendedBuildOrder: ReadonlyArray<{
    readonly surface: string;
    readonly why: string;
    readonly features: readonly string[];
  }>;
  readonly features: readonly PostHogDocumentedFeatureCatalog[];
}

const features: readonly PostHogDocumentedFeatureCatalog[] = [
  {
    feature: "workspace",
    title: "Workspace",
    description: "Organization and project context selection.",
    docsUrl: "https://posthog.com/docs/model-context-protocol",
    priority: "core",
    tools: [
      { name: "organizations-get", purpose: "List organizations the API key can access." },
      { name: "projects-get", purpose: "List projects in the active organization." },
      { name: "switch-project", purpose: "Change the active project when the session is not pinned." },
    ],
  },
  {
    feature: "insights",
    title: "Insights",
    description: "Analytics insights, saved reports, and custom query workflows.",
    docsUrl: "https://posthog.com/docs/model-context-protocol",
    priority: "core",
    tools: [
      { name: "insights-get-all", purpose: "List saved insights." },
      { name: "insight-get", purpose: "Fetch a saved insight." },
      { name: "insight-query", purpose: "Run an existing insight query." },
      { name: "query-run", purpose: "Run a PostHog query for analytics questions." },
    ],
  },
  {
    feature: "dashboards",
    title: "Dashboards",
    description: "Dashboard listing and retrieval for existing product reporting.",
    docsUrl: "https://posthog.com/docs/model-context-protocol",
    priority: "core",
    tools: [
      { name: "dashboards-get-all", purpose: "List dashboards." },
      { name: "dashboard-get", purpose: "Fetch a dashboard." },
    ],
  },
  {
    feature: "flags",
    title: "Feature Flags",
    description: "Feature flag inspection and rollout analysis.",
    docsUrl: "https://posthog.com/docs/model-context-protocol",
    priority: "core",
    tools: [
      { name: "feature-flag-get-all", purpose: "List feature flags." },
      { name: "feature-flag-get-definition", purpose: "Fetch a feature flag definition." },
      { name: "feature-flags-status-retrieve", purpose: "Inspect current rollout status." },
      { name: "feature-flags-user-blast-radius-create", purpose: "Estimate rollout blast radius." },
    ],
  },
  {
    feature: "experiments",
    title: "Experiments",
    description: "Experiment lifecycle and results inspection.",
    docsUrl: "https://posthog.com/docs/model-context-protocol",
    priority: "core",
    tools: [
      { name: "experiment-get-all", purpose: "List experiments." },
      { name: "experiment-get", purpose: "Fetch experiment details." },
      { name: "experiment-results-get", purpose: "Read experiment result summaries." },
    ],
  },
  {
    feature: "errors",
    title: "Error Tracking",
    description: "Error issue triage and debugging.",
    docsUrl: "https://posthog.com/docs/model-context-protocol",
    priority: "core",
    tools: [
      { name: "error-tracking-issues-list", purpose: "List active error issues." },
      { name: "error-tracking-issues-retrieve", purpose: "Inspect one issue." },
    ],
  },
  {
    feature: "logs",
    title: "Logs",
    description: "Log search and attribute discovery.",
    docsUrl: "https://posthog.com/docs/logs/debugging-with-mcp",
    priority: "high",
    tools: [
      { name: "logs-list-attributes", purpose: "List available log attributes." },
      { name: "logs-list-attribute-values", purpose: "Inspect values for one attribute." },
      { name: "logs-query", purpose: "Search logs with filters." },
    ],
  },
  {
    feature: "schema",
    title: "Data Schema",
    description: "Read PostHog event and property schema for the current project.",
    docsUrl: "https://posthog.com/docs/model-context-protocol",
    priority: "high",
    tools: [
      { name: "read-data-schema", purpose: "Explore events, actions, and properties." },
      { name: "event-definitions-list", purpose: "List known event definitions." },
      { name: "properties-list", purpose: "List available properties." },
    ],
  },
  {
    feature: "search",
    title: "Search",
    description: "Search entities and official PostHog documentation.",
    docsUrl: "https://posthog.com/docs/model-context-protocol",
    priority: "high",
    tools: [
      { name: "entity-search", purpose: "Search entities by name or description." },
      { name: "docs-search", purpose: "Search PostHog documentation." },
    ],
  },
];

export const POSTHOG_DOCUMENTED_TOOL_CATALOG: PostHogDocumentedToolCatalog = {
  verifiedAt: "2026-04-06",
  sources: [
    "https://posthog.com/docs/model-context-protocol",
    "https://posthog.com/docs/logs/debugging-with-mcp",
  ],
  serverUrls: {
    us: "https://mcp.posthog.com/mcp",
    eu: "https://mcp-eu.posthog.com/mcp",
  },
  pinning: {
    supportedHeaders: ["x-posthog-organization-id", "x-posthog-project-id"],
    supportedQueryParameters: ["organization_id", "project_id"],
  },
  featureFilterExample: "https://mcp.posthog.com/mcp?features=insights,dashboards,flags,experiments,logs",
  recommendedBuildOrder: [
    {
      surface: "triage",
      why: "Start with read-heavy product and reliability workflows.",
      features: ["workspace", "insights", "dashboards", "errors", "logs", "search"],
    },
    {
      surface: "release-safety",
      why: "Then add flag and experiment visibility for rollout decisions.",
      features: ["flags", "experiments"],
    },
    {
      surface: "schema-awareness",
      why: "Use schema inspection after the core read workflows are in place.",
      features: ["schema"],
    },
  ],
  features,
};

export const getPostHogDocumentedToolCatalog = (input: {
  readonly feature?: string;
  readonly priority?: "core" | "high";
} = {}): PostHogDocumentedToolCatalog => {
  const requestedFeature = input.feature?.trim().toLowerCase();
  const requestedPriority = input.priority;

  const filteredFeatures = features.filter((feature) => {
    if (requestedPriority && feature.priority !== requestedPriority) {
      return false;
    }
    if (requestedFeature && feature.feature !== requestedFeature) {
      return false;
    }
    return true;
  });

  return {
    ...POSTHOG_DOCUMENTED_TOOL_CATALOG,
    features: filteredFeatures,
  };
};

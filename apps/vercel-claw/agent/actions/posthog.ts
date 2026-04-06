import "server-only";

import { tool } from "ai";
import { z } from "zod";
import { getPostHogDocumentedToolCatalog } from "@/lib/server/posthog/documented-tool-catalog";
import { getPostHogClient } from "@/lib/server/posthog/client";
import {
  normalizePostHogDashboard,
  normalizePostHogDashboardList,
  normalizePostHogDocsSearch,
  normalizePostHogExperiment,
  normalizePostHogExperimentResults,
  normalizePostHogExperiments,
  normalizePostHogFeatureFlag,
  normalizePostHogFeatureFlagBlastRadius,
  normalizePostHogFeatureFlagStatus,
  normalizePostHogFeatureFlags,
  normalizePostHogInsight,
  normalizePostHogInsightList,
  normalizePostHogLogAttributes,
  normalizePostHogLogQuery,
  normalizePostHogSchemaEntities,
  normalizePostHogEntityList,
} from "@/lib/server/posthog/native-tool-normalizers";

const POSTHOG_TOOL_ID = "posthog";

const jsonRecordSchema = z.record(z.string(), z.unknown());
const posthogMcpArgumentsSchema = z.object({}).catchall(z.unknown());

const posthogInsightQueryResultSchema = z
  .object({
    name: z.string(),
    columns: z.array(z.string()),
    results: z.array(jsonRecordSchema),
  })
  .strict();

const posthogOrganizationSummarySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1),
    membershipLevel: z.number().int().nullable(),
  })
  .strict();

const posthogProjectSummarySchema = z
  .object({
    id: z.number().int().nonnegative(),
    organizationId: z.string().min(1).nullable(),
    name: z.string().min(1),
    projectToken: z.string().min(1).nullable(),
  })
  .strict();

const posthogGetOrganizationsInputSchema = z.object({}).strict();
const posthogGetOrganizationsResultSchema = z
  .object({
    organizations: z.array(posthogOrganizationSummarySchema),
  })
  .strict();

const posthogGetProjectsInputSchema = z
  .object({
    organizationId: z.string().min(1).optional(),
  })
  .strict();

const posthogGetProjectsResultSchema = z
  .object({
    organizationId: z.string().min(1),
    projects: z.array(posthogProjectSummarySchema),
  })
  .strict();

const posthogRunQueryInputSchema = z
  .object({
    name: z.string().min(1),
    query: z.string().min(1),
    refresh: z
      .enum([
        "blocking",
        "async",
        "force_blocking",
        "force_async",
        "force_cache",
        "lazy_async",
        "async_except_on_cache_miss",
      ])
      .optional(),
  })
  .strict();

const posthogDashboardPerformanceRowSchema = z
  .object({
    path: z.string().min(1),
    valueMs: z.number(),
    samples: z.number().int().nonnegative(),
    status: z.enum(["good", "slow"]),
  })
  .strict();

const posthogDashboardTopPathSchema = z
  .object({
    path: z.string().min(1),
    pageviews: z.number().int().nonnegative(),
  })
  .strict();

const posthogDashboardAnomalySchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum([
      "traffic-drop",
      "exception-spike",
      "slow-lcp",
      "slow-inp",
      "weak-web-vitals-coverage",
    ]),
    severity: z.enum(["warning", "critical"]),
    title: z.string().min(1),
    summary: z.string().min(1),
    metric: z.string().min(1),
    currentValue: z.number(),
    previousValue: z.number().nullable(),
    threshold: z.number(),
    path: z.string().nullable(),
  })
  .strict();

const posthogGetDashboardSnapshotInputSchema = z
  .object({
    windowMinutes: z.number().int().positive().max(1_440).optional(),
    topPathsLimit: z.number().int().positive().max(20).optional(),
  })
  .strict();

const posthogGetDashboardSnapshotResultSchema = z
  .object({
    generatedAt: z.number().int().nonnegative(),
    windowMinutes: z.number().int().positive(),
    summary: z
      .object({
        pageviews: z.number().int().nonnegative(),
        uniqueVisitors: z.number().int().nonnegative(),
        webVitalsEvents: z.number().int().nonnegative(),
        exceptionEvents: z.number().int().nonnegative(),
        distinctExceptionIssues: z.number().int().nonnegative(),
        webVitalsCoverageRatio: z.number(),
        errorRatePer1kPageviews: z.number(),
        slowLcpPages: z.number().int().nonnegative(),
        slowInpPages: z.number().int().nonnegative(),
        productionReadinessScore: z.number().int().min(0).max(100),
        anomalyCount: z.number().int().nonnegative(),
      })
      .strict(),
    previousWindow: z
      .object({
        pageviews: z.number().int().nonnegative(),
        webVitalsEvents: z.number().int().nonnegative(),
        exceptionEvents: z.number().int().nonnegative(),
        pageviewsDeltaPercent: z.number().nullable(),
        webVitalsDeltaPercent: z.number().nullable(),
        exceptionDeltaPercent: z.number().nullable(),
      })
      .strict(),
    topPaths: z.array(posthogDashboardTopPathSchema),
    lcp: z.array(posthogDashboardPerformanceRowSchema),
    inp: z.array(posthogDashboardPerformanceRowSchema),
    anomalies: z.array(posthogDashboardAnomalySchema),
  })
  .strict();

const posthogDocumentedToolSchema = z
  .object({
    name: z.string().min(1),
    purpose: z.string().min(1),
  })
  .strict();

const posthogDocumentedFeatureCatalogSchema = z
  .object({
    feature: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    docsUrl: z.string().url().nullable(),
    priority: z.enum(["core", "high"]),
    tools: z.array(posthogDocumentedToolSchema),
  })
  .strict();

const posthogGetDocumentedToolCatalogInputSchema = z
  .object({
    feature: z.string().min(1).optional(),
    priority: z.enum(["core", "high"]).optional(),
  })
  .strict();

const posthogGetDocumentedToolCatalogResultSchema = z
  .object({
    verifiedAt: z.string().min(1),
    sources: z.array(z.string().url()),
    serverUrls: z
      .object({
        us: z.string().url(),
        eu: z.string().url(),
      })
      .strict(),
    pinning: z
      .object({
        supportedHeaders: z.array(z.string().min(1)),
        supportedQueryParameters: z.array(z.string().min(1)),
      })
      .strict(),
    featureFilterExample: z.string().url(),
    recommendedBuildOrder: z.array(
      z
        .object({
          surface: z.string().min(1),
          why: z.string().min(1),
          features: z.array(z.string().min(1)),
        })
        .strict(),
    ),
    features: z.array(posthogDocumentedFeatureCatalogSchema),
  })
  .strict();

const posthogListResourceInputSchema = z
  .object({
    limit: z.number().int().positive().max(200).optional(),
    offset: z.number().int().nonnegative().optional(),
    search: z.string().min(1).optional(),
    arguments: posthogMcpArgumentsSchema.optional(),
  })
  .strict();

const posthogGetResourceByIdInputSchema = z
  .object({
    id: z.union([z.string().min(1), z.number().int().nonnegative()]),
    arguments: posthogMcpArgumentsSchema.optional(),
  })
  .strict();

const posthogDashboardSummarySchema = z
  .object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    url: z.string().nullable(),
    tags: z.array(z.string()),
    raw: z.unknown(),
  })
  .strict();

const posthogInsightSummarySchema = z
  .object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    queryKind: z.string().nullable(),
    url: z.string().nullable(),
    raw: z.unknown(),
  })
  .strict();

const posthogFeatureFlagSummarySchema = z
  .object({
    id: z.string().nullable(),
    key: z.string().nullable(),
    name: z.string().nullable(),
    status: z.string().nullable(),
    active: z.boolean().nullable(),
    rolloutPercentage: z.number().nullable(),
    url: z.string().nullable(),
    raw: z.unknown(),
  })
  .strict();

const posthogExperimentSummarySchema = z
  .object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    status: z.string().nullable(),
    featureFlagKey: z.string().nullable(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    url: z.string().nullable(),
    raw: z.unknown(),
  })
  .strict();

const posthogLogAttributeSchema = z
  .object({
    key: z.string().min(1),
    type: z.string().nullable(),
    valuesPreview: z.array(z.string()),
    raw: z.unknown(),
  })
  .strict();

const posthogLogEntrySchema = z
  .object({
    id: z.string().nullable(),
    timestamp: z.string().nullable(),
    level: z.string().nullable(),
    message: z.string().nullable(),
    service: z.string().nullable(),
    traceId: z.string().nullable(),
    attributes: jsonRecordSchema,
    raw: z.unknown(),
  })
  .strict();

const posthogNamedEntitySchema = z
  .object({
    id: z.string().nullable(),
    type: z.string().nullable(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    url: z.string().nullable(),
    raw: z.unknown(),
  })
  .strict();

const posthogSchemaEntitySchema = z
  .object({
    name: z.string().min(1),
    kind: z.string().nullable(),
    description: z.string().nullable(),
    raw: z.unknown(),
  })
  .strict();

const posthogDocsSearchResultSchema = z
  .object({
    title: z.string().nullable(),
    url: z.string().nullable(),
    snippet: z.string().nullable(),
    raw: z.unknown(),
  })
  .strict();

const posthogListDashboardsResultSchema = z
  .object({
    text: z.string().optional(),
    total: z.number().int().nonnegative(),
    dashboards: z.array(posthogDashboardSummarySchema),
  })
  .strict();

const posthogGetDashboardResultSchema = z
  .object({
    text: z.string().optional(),
    dashboard: posthogDashboardSummarySchema.nullable(),
  })
  .strict();

const posthogListInsightsResultSchema = z
  .object({
    text: z.string().optional(),
    total: z.number().int().nonnegative(),
    insights: z.array(posthogInsightSummarySchema),
  })
  .strict();

const posthogGetInsightResultSchema = z
  .object({
    text: z.string().optional(),
    insight: posthogInsightSummarySchema.nullable(),
  })
  .strict();

const posthogListFeatureFlagsResultSchema = z
  .object({
    text: z.string().optional(),
    total: z.number().int().nonnegative(),
    flags: z.array(posthogFeatureFlagSummarySchema),
  })
  .strict();

const posthogGetFeatureFlagResultSchema = z
  .object({
    text: z.string().optional(),
    flag: posthogFeatureFlagSummarySchema.nullable(),
  })
  .strict();

const posthogGetFeatureFlagStatusResultSchema = z
  .object({
    text: z.string().optional(),
    flagId: z.string().nullable(),
    status: z.string().nullable(),
    enabled: z.boolean().nullable(),
    summary: z.string().nullable(),
    raw: z.unknown().optional(),
  })
  .strict();

const posthogGetFeatureFlagBlastRadiusResultSchema = z
  .object({
    text: z.string().optional(),
    flagId: z.string().nullable(),
    estimatedAffectedUsers: z.number().nullable(),
    summary: z.string().nullable(),
    raw: z.unknown().optional(),
  })
  .strict();

const posthogListExperimentsResultSchema = z
  .object({
    text: z.string().optional(),
    total: z.number().int().nonnegative(),
    experiments: z.array(posthogExperimentSummarySchema),
  })
  .strict();

const posthogGetExperimentResultSchema = z
  .object({
    text: z.string().optional(),
    experiment: posthogExperimentSummarySchema.nullable(),
  })
  .strict();

const posthogGetExperimentResultsResultSchema = z
  .object({
    text: z.string().optional(),
    experimentId: z.string().nullable(),
    status: z.string().nullable(),
    winningVariant: z.string().nullable(),
    exposureCount: z.number().nullable(),
    significance: z.number().nullable(),
    summary: z.string().nullable(),
    raw: z.unknown().optional(),
  })
  .strict();

const posthogListLogAttributesInputSchema = z
  .object({
    arguments: posthogMcpArgumentsSchema.optional(),
  })
  .strict();

const posthogListLogAttributesResultSchema = z
  .object({
    text: z.string().optional(),
    total: z.number().int().nonnegative(),
    attributes: z.array(posthogLogAttributeSchema),
  })
  .strict();

const posthogQueryLogsInputSchema = z
  .object({
    query: z.string().min(1).optional(),
    limit: z.number().int().positive().max(500).optional(),
    level: z.string().min(1).optional(),
    service: z.string().min(1).optional(),
    from: z.string().min(1).optional(),
    to: z.string().min(1).optional(),
    arguments: posthogMcpArgumentsSchema.optional(),
  })
  .strict();

const posthogQueryLogsResultSchema = z
  .object({
    text: z.string().optional(),
    total: z.number().int().nonnegative(),
    entries: z.array(posthogLogEntrySchema),
  })
  .strict();

const posthogSearchEntitiesInputSchema = z
  .object({
    query: z.string().min(1),
    kind: z.string().min(1).optional(),
    limit: z.number().int().positive().max(200).optional(),
    arguments: posthogMcpArgumentsSchema.optional(),
  })
  .strict();

const posthogSearchEntitiesResultSchema = z
  .object({
    text: z.string().optional(),
    total: z.number().int().nonnegative(),
    entities: z.array(posthogNamedEntitySchema),
  })
  .strict();

const posthogReadDataSchemaInputSchema = z
  .object({
    search: z.string().min(1).optional(),
    limit: z.number().int().positive().max(200).optional(),
    arguments: posthogMcpArgumentsSchema.optional(),
  })
  .strict();

const posthogReadDataSchemaResultSchema = z
  .object({
    text: z.string().optional(),
    total: z.number().int().nonnegative(),
    entities: z.array(posthogSchemaEntitySchema),
    raw: z.unknown().optional(),
  })
  .strict();

const posthogSearchDocsInputSchema = z
  .object({
    query: z.string().min(1),
    arguments: posthogMcpArgumentsSchema.optional(),
  })
  .strict();

const posthogSearchDocsResultSchema = z
  .object({
    text: z.string().optional(),
    total: z.number().int().nonnegative(),
    results: z.array(posthogDocsSearchResultSchema),
  })
  .strict();

const posthogErrorObservationSchema = z
  .object({
    id: z.string().min(1),
    status: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    firstSeen: z.string().nullable(),
    url: z.string().nullable(),
  })
  .strict();

const posthogListErrorsInputSchema = z.object({}).strict();
const posthogListErrorsResultSchema = z
  .object({
    observations: z.array(posthogErrorObservationSchema),
  })
  .strict();

const posthogListMcpToolsInputSchema = z
  .object({
    nameFilter: z.string().min(1).optional(),
    includeInputSchema: z.boolean().optional(),
    limit: z.number().int().positive().max(200).optional(),
  })
  .strict();

const posthogMcpToolSchema = z
  .object({
    name: z.string().min(1),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    inputSchema: z.unknown().optional(),
  })
  .strict();

const posthogListMcpToolsResultSchema = z
  .object({
    total: z.number().int().nonnegative(),
    returned: z.number().int().nonnegative(),
    tools: z.array(posthogMcpToolSchema),
  })
  .strict();

const posthogCallMcpToolInputSchema = z
  .object({
    toolName: z.string().min(1),
    arguments: z.object({}).catchall(z.unknown()).optional(),
  })
  .strict();

const posthogCallMcpToolResultSchema = z
  .object({
    toolName: z.string().min(1),
    text: z.string(),
    structuredContent: z.unknown().optional(),
  })
  .strict();

function isPostHogExposed(exposedToolIds: string[]) {
  return exposedToolIds.includes(POSTHOG_TOOL_ID);
}

export function createPostHogTools(options: { exposedToolIds?: string[] } = {}) {
  const exposedToolIds = options.exposedToolIds ?? [];
  if (!isPostHogExposed(exposedToolIds)) {
    return {};
  }

  const client = getPostHogClient();
  const tools: Record<string, ReturnType<typeof tool>> = {
    posthog_get_documented_tool_catalog: tool({
      description:
        "Return the curated PostHog MCP tool catalog for this repo's supported PostHog surfaces.",
      inputSchema: posthogGetDocumentedToolCatalogInputSchema,
      outputSchema: posthogGetDocumentedToolCatalogResultSchema,
      execute: async (input) => {
        return posthogGetDocumentedToolCatalogResultSchema.parse(
          getPostHogDocumentedToolCatalog(input),
        );
      },
    }),
  };

  if (!client) {
    return tools;
  }

  tools.posthog_get_organizations = tool({
    description: "List the PostHog organizations available to the configured API key.",
    inputSchema: posthogGetOrganizationsInputSchema,
    outputSchema: posthogGetOrganizationsResultSchema,
    execute: async () => {
      return posthogGetOrganizationsResultSchema.parse({
        organizations: await client.getOrganizations(),
      });
    },
  });

  tools.posthog_get_projects = tool({
    description:
      "List PostHog projects for an organization. If organizationId is omitted, the first accessible organization is used.",
    inputSchema: posthogGetProjectsInputSchema,
    outputSchema: posthogGetProjectsResultSchema,
    execute: async (input) => {
      return posthogGetProjectsResultSchema.parse(await client.getProjects(input.organizationId));
    },
  });

  tools.posthog_list_mcp_tools = tool({
    description:
      "List the PostHog MCP tool catalog currently available to this session and optionally include input schemas.",
    inputSchema: posthogListMcpToolsInputSchema,
    outputSchema: posthogListMcpToolsResultSchema,
    execute: async (input) => {
      return posthogListMcpToolsResultSchema.parse(await client.listMcpTools(input));
    },
  });

  tools.posthog_call_mcp_tool = tool({
    description:
      "Call a PostHog MCP tool directly by name with JSON arguments. Use posthog_list_mcp_tools first if the name is unclear.",
    inputSchema: posthogCallMcpToolInputSchema,
    outputSchema: posthogCallMcpToolResultSchema,
    execute: async (input) => {
      return posthogCallMcpToolResultSchema.parse(
        await client.callMcpTool(input.toolName, input.arguments),
      );
    },
  });

  tools.posthog_search_docs = tool({
    description: "Search the PostHog docs via the MCP server.",
    inputSchema: posthogSearchDocsInputSchema,
    outputSchema: posthogSearchDocsResultSchema,
    execute: async (input) => {
      const result = await client.callMcpTool("docs-search", {
        query: input.query,
        ...input.arguments,
      });
      return posthogSearchDocsResultSchema.parse(normalizePostHogDocsSearch(result));
    },
  });

  if (client.capabilities.canReadInsights) {
    tools.posthog_run_query = tool({
      description: "Run a PostHog query against the current project.",
      inputSchema: posthogRunQueryInputSchema,
      outputSchema: posthogInsightQueryResultSchema,
      execute: async (input) => {
        return posthogInsightQueryResultSchema.parse(
          await client.runQuery(input.name, input.query, input.refresh),
        );
      },
    });

    tools.posthog_get_dashboard_snapshot = tool({
      description:
        "Build a PostHog dashboard snapshot with traffic, exceptions, vitals coverage, and anomaly scoring.",
      inputSchema: posthogGetDashboardSnapshotInputSchema,
      outputSchema: posthogGetDashboardSnapshotResultSchema,
      execute: async (input) => {
        return posthogGetDashboardSnapshotResultSchema.parse(
          await client.getDashboardSnapshot(input),
        );
      },
    });

    tools.posthog_list_dashboards = tool({
      description: "List dashboards in the active PostHog project.",
      inputSchema: posthogListResourceInputSchema,
      outputSchema: posthogListDashboardsResultSchema,
      execute: async (input) => {
        const result = await client.callMcpTool("dashboards-get-all", {
          limit: input.limit,
          offset: input.offset,
          search: input.search,
          ...input.arguments,
        });
        return posthogListDashboardsResultSchema.parse(normalizePostHogDashboardList(result));
      },
    });

    tools.posthog_get_dashboard = tool({
      description: "Fetch a PostHog dashboard by id.",
      inputSchema: posthogGetResourceByIdInputSchema,
      outputSchema: posthogGetDashboardResultSchema,
      execute: async (input) => {
        const result = await client.callMcpTool("dashboard-get", {
          id: input.id,
          ...input.arguments,
        });
        return posthogGetDashboardResultSchema.parse(normalizePostHogDashboard(result));
      },
    });

    tools.posthog_list_insights = tool({
      description: "List saved PostHog insights.",
      inputSchema: posthogListResourceInputSchema,
      outputSchema: posthogListInsightsResultSchema,
      execute: async (input) => {
        const result = await client.callMcpTool("insights-get-all", {
          limit: input.limit,
          offset: input.offset,
          search: input.search,
          ...input.arguments,
        });
        return posthogListInsightsResultSchema.parse(normalizePostHogInsightList(result));
      },
    });

    tools.posthog_get_insight = tool({
      description: "Fetch a saved PostHog insight by id.",
      inputSchema: posthogGetResourceByIdInputSchema,
      outputSchema: posthogGetInsightResultSchema,
      execute: async (input) => {
        const result = await client.callMcpTool("insight-get", {
          id: input.id,
          ...input.arguments,
        });
        return posthogGetInsightResultSchema.parse(normalizePostHogInsight(result));
      },
    });

    tools.posthog_search_entities = tool({
      description: "Search PostHog entities with normalized results.",
      inputSchema: posthogSearchEntitiesInputSchema,
      outputSchema: posthogSearchEntitiesResultSchema,
      execute: async (input) => {
        const result = await client.callMcpTool("entity-search", {
          query: input.query,
          kind: input.kind,
          limit: input.limit,
          ...input.arguments,
        });
        const normalized = normalizePostHogEntityList(result, [
          "results",
          "entities",
          "items",
          "data",
        ]);
        return posthogSearchEntitiesResultSchema.parse({
          text: normalized.text,
          total: normalized.total,
          entities: normalized.entities,
        });
      },
    });

    tools.posthog_read_data_schema = tool({
      description:
        "Read PostHog event and property schema with normalized entity summaries.",
      inputSchema: posthogReadDataSchemaInputSchema,
      outputSchema: posthogReadDataSchemaResultSchema,
      execute: async (input) => {
        const result = await client.callMcpTool("read-data-schema", {
          search: input.search,
          limit: input.limit,
          ...input.arguments,
        });
        return posthogReadDataSchemaResultSchema.parse(
          normalizePostHogSchemaEntities(result, [
            "events",
            "actions",
            "properties",
            "results",
            "items",
          ]),
        );
      },
    });
  }

  if (client.capabilities.canReadErrors) {
    tools.posthog_list_errors = tool({
      description: "List active PostHog error tracking issues.",
      inputSchema: posthogListErrorsInputSchema,
      outputSchema: posthogListErrorsResultSchema,
      execute: async () => {
        return posthogListErrorsResultSchema.parse({
          observations: await client.listErrors(),
        });
      },
    });
  }

  if (client.capabilities.canReadFlags) {
    tools.posthog_list_feature_flags = tool({
      description: "List feature flags with normalized rollout metadata.",
      inputSchema: posthogListResourceInputSchema,
      outputSchema: posthogListFeatureFlagsResultSchema,
      execute: async (input) => {
        const result = await client.callMcpTool("feature-flag-get-all", {
          limit: input.limit,
          offset: input.offset,
          search: input.search,
          ...input.arguments,
        });
        return posthogListFeatureFlagsResultSchema.parse(
          normalizePostHogFeatureFlags(result),
        );
      },
    });

    tools.posthog_get_feature_flag = tool({
      description: "Fetch a feature flag definition with normalized rollout metadata.",
      inputSchema: posthogGetResourceByIdInputSchema,
      outputSchema: posthogGetFeatureFlagResultSchema,
      execute: async (input) => {
        const result = await client.callMcpTool("feature-flag-get-definition", {
          id: input.id,
          ...input.arguments,
        });
        return posthogGetFeatureFlagResultSchema.parse(normalizePostHogFeatureFlag(result));
      },
    });

    tools.posthog_get_feature_flag_status = tool({
      description: "Inspect rollout status and enablement for a feature flag.",
      inputSchema: posthogGetResourceByIdInputSchema,
      outputSchema: posthogGetFeatureFlagStatusResultSchema,
      execute: async (input) => {
        const result = await client.callMcpTool("feature-flags-status-retrieve", {
          id: input.id,
          ...input.arguments,
        });
        return posthogGetFeatureFlagStatusResultSchema.parse(
          normalizePostHogFeatureFlagStatus(result),
        );
      },
    });

    tools.posthog_get_feature_flag_blast_radius = tool({
      description: "Estimate the blast radius of a feature flag rollout.",
      inputSchema: posthogGetResourceByIdInputSchema,
      outputSchema: posthogGetFeatureFlagBlastRadiusResultSchema,
      execute: async (input) => {
        const result = await client.callMcpTool(
          "feature-flags-user-blast-radius-create",
          {
            id: input.id,
            ...input.arguments,
          },
        );
        return posthogGetFeatureFlagBlastRadiusResultSchema.parse(
          normalizePostHogFeatureFlagBlastRadius(result),
        );
      },
    });
  }

  if (client.capabilities.canReadExperiments) {
    tools.posthog_list_experiments = tool({
      description: "List PostHog experiments with normalized metadata.",
      inputSchema: posthogListResourceInputSchema,
      outputSchema: posthogListExperimentsResultSchema,
      execute: async (input) => {
        const result = await client.callMcpTool("experiment-get-all", {
          limit: input.limit,
          offset: input.offset,
          search: input.search,
          ...input.arguments,
        });
        return posthogListExperimentsResultSchema.parse(
          normalizePostHogExperiments(result),
        );
      },
    });

    tools.posthog_get_experiment = tool({
      description: "Fetch experiment details with normalized lifecycle metadata.",
      inputSchema: posthogGetResourceByIdInputSchema,
      outputSchema: posthogGetExperimentResultSchema,
      execute: async (input) => {
        const result = await client.callMcpTool("experiment-get", {
          id: input.id,
          ...input.arguments,
        });
        return posthogGetExperimentResultSchema.parse(normalizePostHogExperiment(result));
      },
    });

    tools.posthog_get_experiment_results = tool({
      description: "Fetch normalized experiment result summary data.",
      inputSchema: posthogGetResourceByIdInputSchema,
      outputSchema: posthogGetExperimentResultsResultSchema,
      execute: async (input) => {
        const result = await client.callMcpTool("experiment-results-get", {
          id: input.id,
          ...input.arguments,
        });
        return posthogGetExperimentResultsResultSchema.parse(
          normalizePostHogExperimentResults(result),
        );
      },
    });
  }

  if (client.capabilities.canReadLogs) {
    tools.posthog_list_log_attributes = tool({
      description: "List available PostHog log attributes with normalized previews.",
      inputSchema: posthogListLogAttributesInputSchema,
      outputSchema: posthogListLogAttributesResultSchema,
      execute: async (input) => {
        const result = await client.callMcpTool("logs-list-attributes", {
          ...input.arguments,
        });
        return posthogListLogAttributesResultSchema.parse(
          normalizePostHogLogAttributes(result),
        );
      },
    });

    tools.posthog_query_logs = tool({
      description: "Query PostHog logs with normalized log entries.",
      inputSchema: posthogQueryLogsInputSchema,
      outputSchema: posthogQueryLogsResultSchema,
      execute: async (input) => {
        const result = await client.callMcpTool("logs-query", {
          query: input.query,
          limit: input.limit,
          level: input.level,
          service: input.service,
          from: input.from,
          to: input.to,
          ...input.arguments,
        });
        return posthogQueryLogsResultSchema.parse(normalizePostHogLogQuery(result));
      },
    });
  }

  return tools;
}

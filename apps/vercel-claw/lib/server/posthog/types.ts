export interface PostHogInsightQueryResult {
  readonly name: string;
  readonly columns: readonly string[];
  readonly results: readonly Record<string, unknown>[];
}

export interface PostHogOrganizationSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly membershipLevel: number | null;
}

export interface PostHogProjectSummary {
  readonly id: number;
  readonly organizationId: string | null;
  readonly name: string;
  readonly projectToken: string | null;
}

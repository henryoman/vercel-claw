import {
  formatToolSchemasForPrompt,
  generateToolSchemas,
  type GeneratedToolSchema,
  type ToolManifestLike,
} from "./generateToolSchema";
import {
  formatCurrentTimeForPrompt,
  getCurrentTime,
  type CurrentTimeContext,
  type GetCurrentTimeOptions,
} from "./getCurrentTime";
import {
  formatLocationForPrompt,
  getLocation,
  type GetLocationOptions,
  type LocationContext,
} from "./getLocation";
import {
  formatUserGeneratedPromptForPrompt,
  getUserGeneratedPrompt,
  type UserGeneratedPromptContext,
  type UserPromptMessageLike,
} from "./getUserGeneratedPrompt";
import { getTimeZone } from "./getTimeZone";

export type ContextUtilitySectionKey =
  | "currentTime"
  | "location"
  | "timeZone"
  | "toolSchemas"
  | "userGeneratedPrompt";

export interface ContextUtilitySection {
  key: ContextUtilitySectionKey;
  label: string;
  value: string;
}

export interface LoadContextUtilitiesInput extends GetCurrentTimeOptions {
  includeCurrentTime?: boolean;
  includeLocation?: boolean;
  includeTimeZone?: boolean;
  includeToolSchemas?: boolean;
  includeUserGeneratedPrompt?: boolean;
  location?: GetLocationOptions;
  messages?: readonly UserPromptMessageLike[] | string | null;
  tools?: readonly ToolManifestLike[];
}

export interface LoadedContextUtilities {
  prompt: string;
  sections: ContextUtilitySection[];
  values: {
    currentTime: CurrentTimeContext | null;
    location: LocationContext | null;
    timeZone: string;
    toolSchemas: GeneratedToolSchema[];
    userGeneratedPrompt: UserGeneratedPromptContext | null;
  };
}

export function loadContextUtilities(input: LoadContextUtilitiesInput = {}): LoadedContextUtilities {
  const timeZone = getTimeZone({
    locale: input.locale,
    timeZone: input.timeZone ?? input.location?.timeZone,
  });
  const currentTime =
    input.includeCurrentTime === false
      ? null
      : getCurrentTime({
          locale: input.locale,
          now: input.now,
          timeZone,
        });
  const location =
    input.includeLocation === false
      ? null
      : getLocation({
          ...input.location,
          locale: input.location?.locale ?? input.locale,
          timeZone: input.location?.timeZone ?? timeZone,
        });
  const userGeneratedPrompt =
    input.includeUserGeneratedPrompt === false ? null : getUserGeneratedPrompt(input.messages);
  const toolSchemas = input.includeToolSchemas === false ? [] : generateToolSchemas(input.tools ?? []);
  const sections = buildSections({
    currentTime,
    input,
    location,
    timeZone,
    toolSchemas,
    userGeneratedPrompt,
  });

  return {
    prompt: sections.map((section) => section.value).join("\n\n"),
    sections,
    values: {
      currentTime,
      location,
      timeZone,
      toolSchemas,
      userGeneratedPrompt,
    },
  };
}

export function formatContextUtilitiesForPrompt(input: LoadContextUtilitiesInput = {}) {
  return loadContextUtilities(input).prompt;
}

function buildSections(input: {
  currentTime: CurrentTimeContext | null;
  input: LoadContextUtilitiesInput;
  location: LocationContext | null;
  timeZone: string;
  toolSchemas: GeneratedToolSchema[];
  userGeneratedPrompt: UserGeneratedPromptContext | null;
}) {
  const sections: ContextUtilitySection[] = [];

  if (input.currentTime) {
    sections.push({
      key: "currentTime",
      label: "Current time",
      value: formatCurrentTimeForPrompt({
        locale: input.currentTime.locale,
        now: input.currentTime.unixMs,
        timeZone: input.currentTime.timeZone,
      }),
    });
  }

  if (input.input.includeTimeZone !== false) {
    sections.push({
      key: "timeZone",
      label: "Time zone",
      value: `Resolved time zone: ${input.timeZone}`,
    });
  }

  if (input.location) {
    const formatted = formatLocationForPrompt({
      city: input.location.city,
      country: input.location.country,
      countryCode: input.location.countryCode,
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      region: input.location.region,
      timeZone: input.location.timeZone,
    });

    if (formatted) {
      sections.push({
        key: "location",
        label: "Location",
        value: formatted,
      });
    }
  }

  if (input.userGeneratedPrompt) {
    const formatted = formatUserGeneratedPromptForPrompt(input.userGeneratedPrompt.text);
    if (formatted) {
      sections.push({
        key: "userGeneratedPrompt",
        label: "Latest user prompt",
        value: formatted,
      });
    }
  }

  if (input.toolSchemas.length > 0) {
    const formatted = formatToolSchemasForPrompt(input.input.tools ?? []);
    if (formatted) {
      sections.push({
        key: "toolSchemas",
        label: "Tool schemas",
        value: formatted,
      });
    }
  }

  return sections;
}

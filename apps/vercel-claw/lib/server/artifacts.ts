import type { ArtifactKind, ArtifactRecord, Surface } from "@vercel-claw/core";
import { api, getConvexClient } from "./convex";
import type { Id } from "@/convex/_generated/dataModel";

export async function createTextArtifact(input: {
  threadId: string;
  kind: ArtifactKind;
  label: string;
  surface: Surface;
  text: string;
  externalArtifactId?: string;
}): Promise<ArtifactRecord> {
  return await getConvexClient().mutation(api.artifacts.createText, {
    threadId: input.threadId as Id<"threads">,
    kind: input.kind,
    label: input.label,
    surface: input.surface,
    text: input.text,
    externalArtifactId: input.externalArtifactId,
  });
}

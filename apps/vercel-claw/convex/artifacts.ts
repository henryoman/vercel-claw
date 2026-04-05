import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getThreadOrThrow, mapArtifact } from "./lib/threads";
import { artifactKindValidator, artifactRecordValidator, surfaceValidator } from "./lib/validators";

export const listByThread = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.array(artifactRecordValidator),
  handler: async (ctx, args) => {
    const artifacts = await ctx.db
      .query("artifacts")
      .withIndex("by_thread", (query) => query.eq("threadId", args.threadId))
      .collect();

    return artifacts.map((artifact) => mapArtifact(artifact as Parameters<typeof mapArtifact>[0]));
  },
});

export const createText = mutation({
  args: {
    threadId: v.id("threads"),
    kind: artifactKindValidator,
    label: v.string(),
    surface: surfaceValidator,
    text: v.string(),
    externalArtifactId: v.optional(v.string()),
  },
  returns: artifactRecordValidator,
  handler: async (ctx, args) => {
    const thread = await getThreadOrThrow(ctx, args.threadId);

    const artifactId = await ctx.db.insert("artifacts", {
      threadId: args.threadId,
      instanceId: thread.instanceId,
      kind: args.kind,
      label: args.label,
      surface: args.surface,
      text: args.text,
      externalArtifactId: args.externalArtifactId,
      createdAt: Date.now(),
    });

    const artifact = await ctx.db.get(artifactId);
    if (!artifact) {
      throw new Error("Artifact creation failed");
    }

    return mapArtifact(artifact as Parameters<typeof mapArtifact>[0]);
  },
});

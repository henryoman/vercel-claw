import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

let convexClient: ConvexHttpClient | null = null;

export function getConvexClient() {
  if (convexClient) {
    return convexClient;
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
  }

  convexClient = new ConvexHttpClient(convexUrl);
  return convexClient;
}

export { api };

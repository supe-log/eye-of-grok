import { grokAnalyze, heuristicAnalyze } from "./analyze";
import type { AnalyzeResult, OrgSnapshot } from "./types";

export async function analyzeOrg(snapshot: OrgSnapshot): Promise<AnalyzeResult> {
  try {
    return await grokAnalyze(snapshot);
  } catch {
    const fallback = heuristicAnalyze(snapshot);
    return {
      ...fallback,
      onboarding: `${fallback.onboarding} Grok was unreachable, so this plan is the deterministic fallback.`,
    };
  }
}

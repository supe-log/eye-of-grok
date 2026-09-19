import { grokAnalyzePayloadSchema } from "./schema";
import { snapshotCapacity } from "./capacity";
import { snapshotToMermaid } from "./mermaid";
import type { AnalyzeRecommendation, AnalyzeResult, OrgSnapshot } from "./types";

const ANALYZE_SYSTEM = `You are the roster hygienist for a Grok Bot account.
Official roster rules:
- Smallest useful roster. One Bot owns one end-to-end outcome.
- Add a Bot only for a stable specialist role.
- Group chats are for visible handoffs, 2–6 Bots only. Never treat the 50 Bot+group cap as a target.
- Hide is safer than delete. Hide does not pause routines. Delete drops profile/conversation/routines; shared computer files remain.
- Duplicate copies profile but not memory. "General helper" is an anti-pattern.
- Capabilities (tools/computer) are account-level. Memory stays per Bot.
- You only know nodes in the snapshot. Never invent ids.

Return JSON only:
{
  "onboarding": "2-5 sentences for a new human: who to talk to for what",
  "recommendations": [
    { "action": "keep"|"hide"|"merge"|"close_group", "nodeIds": ["existing-id"], "why": "one sentence" }
  ],
  "leanMermaid": "optional flowchart TB of the lean org using the same node ids"
}

Cite only node ids from the snapshot. Prefer hide/merge/close_group over keep noise. Keep the Chief of Staff and real specialists.`;

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  return JSON.parse(raw) as unknown;
}

function filterRecommendations(
  snapshot: OrgSnapshot,
  recs: AnalyzeRecommendation[],
): AnalyzeRecommendation[] {
  const ids = new Set(snapshot.nodes.map((node) => node.id));
  return recs
    .map((rec) => ({
      ...rec,
      nodeIds: rec.nodeIds.filter((id) => ids.has(id)),
    }))
    .filter((rec) => rec.nodeIds.length > 0);
}

function hideIdsFrom(recs: AnalyzeRecommendation[]): string[] {
  const hide = new Set<string>();
  for (const rec of recs) {
    if (rec.action === "hide" || rec.action === "close_group") {
      rec.nodeIds.forEach((id) => hide.add(id));
    }
    if (rec.action === "merge" && rec.nodeIds.length > 1) {
      rec.nodeIds.slice(1).forEach((id) => hide.add(id));
    }
  }
  return [...hide];
}

export function heuristicAnalyze(snapshot: OrgSnapshot): AnalyzeResult {
  const capacity = snapshotCapacity(snapshot);
  const recommendations: AnalyzeRecommendation[] = [];

  const duplicates = snapshot.nodes.filter((node) => node.status === "duplicate");
  if (duplicates.length >= 2) {
    recommendations.push({
      action: "merge",
      nodeIds: duplicates.map((node) => node.id),
      why: "Two general-helper Bots. Keep one specialist lane or hide both; copies do not share memory.",
    });
  } else {
    for (const node of duplicates) {
      recommendations.push({
        action: "hide",
        nodeIds: [node.id],
        why: `${node.name} is a general helper — hide it so context stays with named owners.`,
      });
    }
  }

  for (const node of snapshot.nodes) {
    if (node.status === "deprecated" && node.kind === "bot") {
      recommendations.push({
        action: "hide",
        nodeIds: [node.id],
        why: `${node.name} is a retired role. Hide it; do not delete unless you accept losing that conversation.`,
      });
    }
    if (node.status === "stale" && node.kind === "bot") {
      recommendations.push({
        action: "hide",
        nodeIds: [node.id],
        why: `${node.name} has gone quiet and overlaps a living owner.`,
      });
    }
    if (node.status === "hidden") {
      recommendations.push({
        action: "hide",
        nodeIds: [node.id],
        why: `${node.name} is already hidden but still active — pause or retire its routines. Hide ≠ pause.`,
      });
    }
    if (node.kind === "group" && (node.status === "deprecated" || node.status === "stale")) {
      recommendations.push({
        action: "close_group",
        nodeIds: [node.id],
        why: `${node.name} no longer has a shared outcome. Close the space.`,
      });
    }
  }

  for (const groupId of capacity.overstaffedGroupIds) {
    const group = snapshot.nodes.find((node) => node.id === groupId);
    recommendations.push({
      action: "close_group",
      nodeIds: [groupId],
      why: `${group?.name ?? groupId} has more than 6 members. Split or shrink to the product cap.`,
    });
  }

  const keep = snapshot.nodes.filter(
    (node) =>
      node.status === "active" &&
      node.kind !== "group" &&
      !duplicates.some((dup) => dup.id === node.id),
  );
  if (keep.length) {
    recommendations.unshift({
      action: "keep",
      nodeIds: keep.map((node) => node.id),
      why: "Named specialists plus the Chief of Staff and you — the lean spine.",
    });
  }

  const filtered = filterRecommendations(snapshot, recommendations);
  const onboarding = [
    "Start with Casey (Chief of Staff). Give outcomes, not tasks.",
    "Jules owns GTM, Chang owns recruiting, Emily owns engineering breakdown, Pete owns product writing, Ashley owns numbers, Tyler owns expenses.",
    "Join Onboarding and Website launch. Skip v1 launch and Q2 planning — those rooms are leftover scale.",
    "Memory is per Bot. The computer is shared. Do not treat a hidden Bot as gone.",
  ].join(" ");

  return {
    source: "heuristic",
    onboarding,
    capacity,
    recommendations: filtered,
    leanMermaid: snapshotToMermaid(snapshot, { omitIds: hideIdsFrom(filtered) }),
  };
}

function grokApiKey(): string | null {
  return process.env.XAI_API_KEY ?? process.env.GROK_API_KEY ?? null;
}

export async function grokAnalyze(snapshot: OrgSnapshot): Promise<AnalyzeResult> {
  const key = grokApiKey();
  if (!key) {
    return heuristicAnalyze(snapshot);
  }

  const base = process.env.XAI_BASE_URL ?? "https://api.x.ai/v1";
  const model = process.env.GROK_MODEL ?? "grok-4.6";

  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ANALYZE_SYSTEM },
        {
          role: "user",
          content: JSON.stringify({
            capacity: snapshotCapacity(snapshot),
            snapshot,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Grok analyze failed (${response.status}): ${detail.slice(0, 400)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Grok returned an empty analyze payload");
  }

  const parsed = grokAnalyzePayloadSchema.parse(extractJson(content));
  const recommendations = filterRecommendations(snapshot, parsed.recommendations);
  const leanMermaid =
    parsed.leanMermaid && parsed.leanMermaid.trim().startsWith("flowchart")
      ? parsed.leanMermaid
      : snapshotToMermaid(snapshot, { omitIds: hideIdsFrom(recommendations) });

  return {
    source: "grok-4.6",
    onboarding: parsed.onboarding,
    capacity: snapshotCapacity(snapshot),
    recommendations,
    leanMermaid,
  };
}

import { z } from "zod";
import {
  ANALYZE_ACTIONS,
  EDGE_KINDS,
  NODE_KINDS,
  NODE_STATUSES,
  SNAPSHOT_SOURCES,
} from "./types";

export const orgNodeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(NODE_KINDS),
  name: z.string().min(1),
  title: z.string().optional(),
  status: z.enum(NODE_STATUSES),
  lastActiveAt: z.string().optional(),
  notes: z.string().optional(),
});

export const orgEdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  kind: z.enum(EDGE_KINDS),
});

export const orgSnapshotSchema = z.object({
  orgId: z.string().min(1),
  pushedAt: z.string().min(1),
  source: z.enum(SNAPSHOT_SOURCES),
  notes: z.string().optional(),
  tools: z.array(z.string().min(1)).optional(),
  nodes: z.array(orgNodeSchema).min(1),
  edges: z.array(orgEdgeSchema),
});

export const analyzeRecommendationSchema = z.object({
  action: z.enum(ANALYZE_ACTIONS),
  nodeIds: z.array(z.string().min(1)).min(1),
  why: z.string().min(1),
});

export const analyzeResultSchema = z.object({
  source: z.enum(["grok-4.6", "heuristic"]),
  onboarding: z.string().min(1),
  capacity: z.object({
    botsAndGroups: z.number(),
    limit: z.number(),
    overstaffedGroupIds: z.array(z.string()),
  }),
  recommendations: z.array(analyzeRecommendationSchema),
  leanMermaid: z.string().optional(),
});

export const grokAnalyzePayloadSchema = z.object({
  onboarding: z.string().min(1),
  recommendations: z.array(analyzeRecommendationSchema),
  leanMermaid: z.string().optional(),
});

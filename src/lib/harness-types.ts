import { z } from "zod";

export const INDUSTRIES = ["insurance_agency", "small_business"] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const AUTONOMY_LEVELS = ["draft_only", "ask_first", "autonomous"] as const;
export type Autonomy = (typeof AUTONOMY_LEVELS)[number];

export const FEEDBACK_RATINGS = ["up", "down"] as const;
export const FEEDBACK_TAGS = [
  "great",
  "wrong",
  "slow",
  "too_risky",
  "missing",
] as const;
export type FeedbackTag = (typeof FEEDBACK_TAGS)[number];

export const FEEDBACK_SOURCES = ["owner", "bot"] as const;

export const PROPOSAL_KINDS = [
  "add_rule",
  "lower_autonomy",
  "raise_autonomy",
  "add_bot",
] as const;
export type ProposalKind = (typeof PROPOSAL_KINDS)[number];

export const PROPOSAL_STATUSES = ["open", "approved", "rejected", "applied"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const intakeSchema = z.object({
  businessName: z.string().trim().min(2).max(80),
  industry: z.enum(INDUSTRIES),
  teamSize: z.number().int().min(1).max(500),
  tools: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  painPoints: z.string().trim().max(2000).default(""),
  rules: z.string().trim().max(2000).default(""),
});
export type Intake = z.infer<typeof intakeSchema>;

export const planSkillSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  content: z.string().min(1),
});
export type PlanSkill = z.infer<typeof planSkillSchema>;

export const planRoutineSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  schedule: z.string().min(1),
  prompt: z.string().min(1),
  enabled: z.boolean(),
});
export type PlanRoutine = z.infer<typeof planRoutineSchema>;

export const planBotSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  rules: z.array(z.string().min(1)),
  autonomy: z.enum(AUTONOMY_LEVELS),
  skills: z.array(planSkillSchema),
  routines: z.array(planRoutineSchema),
});
export type PlanBot = z.infer<typeof planBotSchema>;

export const planGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  purpose: z.string().min(1),
  memberIds: z.array(z.string().min(1)).min(2).max(6),
});
export type PlanGroup = z.infer<typeof planGroupSchema>;

export const teamPlanSchema = z.object({
  orgId: z.string().min(1),
  version: z.number().int().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  intake: intakeSchema,
  chiefOfStaffId: z.string().min(1),
  bots: z.array(planBotSchema).min(1),
  groups: z.array(planGroupSchema),
  hardRules: z.array(z.string().min(1)),
  changelog: z.array(
    z.object({ version: z.number().int(), at: z.string(), summary: z.string() }),
  ),
});
export type TeamPlan = z.infer<typeof teamPlanSchema>;

export const feedbackInputSchema = z.object({
  botId: z.string().min(1).optional(),
  rating: z.enum(FEEDBACK_RATINGS),
  tag: z.enum(FEEDBACK_TAGS).optional(),
  comment: z.string().trim().max(1000).default(""),
  source: z.enum(FEEDBACK_SOURCES).default("owner"),
});
export type FeedbackInput = z.infer<typeof feedbackInputSchema>;

export const feedbackSchema = feedbackInputSchema.extend({
  id: z.string().min(1),
  createdAt: z.string(),
  retroAt: z.string().optional(),
});
export type Feedback = z.infer<typeof feedbackSchema>;

export const proposalSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(PROPOSAL_KINDS),
  botId: z.string().optional(),
  title: z.string().min(1),
  why: z.string().min(1),
  change: z.record(z.string(), z.unknown()),
  addsPowers: z.boolean(),
  status: z.enum(PROPOSAL_STATUSES),
  createdAt: z.string(),
  decidedAt: z.string().optional(),
  appliedAt: z.string().optional(),
});
export type Proposal = z.infer<typeof proposalSchema>;

export const harnessStateSchema = z.object({
  plan: teamPlanSchema,
  feedback: z.array(feedbackSchema),
  proposals: z.array(proposalSchema),
});
export type HarnessState = z.infer<typeof harnessStateSchema>;

export const FEEDBACK_KEEP = 500;

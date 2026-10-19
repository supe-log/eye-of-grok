import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getSql, hasDatabase } from "./db";
import {
  FEEDBACK_KEEP,
  harnessStateSchema,
  type Feedback,
  type FeedbackInput,
  type HarnessState,
  type Intake,
  type Proposal,
  type TeamPlan,
} from "./harness-types";
import { isValidOrgId, normalizeOrgId } from "./org-id";
import { planToSnapshot } from "./plan-export";
import { applyProposal, proposeChanges } from "./retro";
import { getOrg, saveOrg } from "./store";
import { designTeam } from "./team-templates";

const DATA_DIR = path.join(process.cwd(), "data", "harness");
const PLANNED_NOTE_PREFIX = "Planned team";

let schemaReady = false;

async function ensureHarnessSchema(): Promise<void> {
  if (schemaReady) return;
  await getSql()`
    CREATE TABLE IF NOT EXISTS team_harness (
      org_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  schemaReady = true;
}

function requireOrgId(raw: string): string {
  const id = normalizeOrgId(raw);
  if (!isValidOrgId(id)) throw new Error(`invalid_org_id: ${raw}`);
  return id;
}

export async function getHarness(rawOrgId: string): Promise<HarnessState | null> {
  const id = normalizeOrgId(rawOrgId);
  if (!isValidOrgId(id)) return null;
  if (hasDatabase()) {
    await ensureHarnessSchema();
    const rows = await getSql()`
      SELECT payload FROM team_harness WHERE org_id = ${id} LIMIT 1
    `;
    const payload = rows[0]?.payload;
    return payload ? harnessStateSchema.parse(payload) : null;
  }
  const file = path.join(DATA_DIR, `${id}.json`);
  if (!existsSync(file)) return null;
  return harnessStateSchema.parse(JSON.parse(readFileSync(file, "utf8")) as unknown);
}

async function saveHarness(state: HarnessState): Promise<HarnessState> {
  const parsed = harnessStateSchema.parse({
    ...state,
    feedback: state.feedback.slice(-FEEDBACK_KEEP),
  });
  if (hasDatabase()) {
    await ensureHarnessSchema();
    await getSql()`
      INSERT INTO team_harness (org_id, payload)
      VALUES (${parsed.plan.orgId}, ${JSON.stringify(parsed)}::jsonb)
      ON CONFLICT (org_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
    `;
    return parsed;
  }
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(
    path.join(DATA_DIR, `${parsed.plan.orgId}.json`),
    JSON.stringify(parsed, null, 2),
    "utf8",
  );
  return parsed;
}

/** Redraw the map from the plan only while no Chief of Staff has pushed a real roster. */
async function syncPlannedMap(plan: TeamPlan, force = false): Promise<void> {
  const current = await getOrg(plan.orgId);
  const planned = current?.notes?.startsWith(PLANNED_NOTE_PREFIX) ?? false;
  const untouched = current?.source !== "chief_of_staff" && (current?.nodes.length ?? 0) <= 1;
  if (!force && !planned && !untouched) return;
  await saveOrg(
    planToSnapshot(plan, `${PLANNED_NOTE_PREFIX} v${plan.version}. Install the Setup Chief of Staff to make it real.`),
  );
}

export async function createHarness(
  rawOrgId: string,
  intake: Intake,
): Promise<HarnessState> {
  const id = requireOrgId(rawOrgId);
  const plan = designTeam(id, intake);
  const state = await saveHarness({ plan, feedback: [], proposals: [] });
  await syncPlannedMap(plan, true);
  return state;
}

export async function addFeedback(
  rawOrgId: string,
  input: FeedbackInput,
): Promise<Feedback> {
  const state = await mustGet(rawOrgId);
  if (input.botId && !state.plan.bots.some((bot) => bot.id === input.botId)) {
    throw new Error(`unknown_bot: ${input.botId}`);
  }
  const entry: Feedback = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await saveHarness({ ...state, feedback: [...state.feedback, entry] });
  return entry;
}

export async function runRetro(rawOrgId: string): Promise<Proposal[]> {
  const state = await mustGet(rawOrgId);
  const now = new Date().toISOString();
  const fresh = state.feedback.filter((entry) => !entry.retroAt);
  const proposals = proposeChanges(state.plan, fresh, state.proposals);
  await saveHarness({
    ...state,
    feedback: state.feedback.map((entry) => (entry.retroAt ? entry : { ...entry, retroAt: now })),
    proposals: [...state.proposals, ...proposals],
  });
  return proposals;
}

export async function decideProposal(
  rawOrgId: string,
  proposalId: string,
  decision: "approved" | "rejected",
): Promise<HarnessState> {
  const state = await mustGet(rawOrgId);
  const proposal = state.proposals.find((item) => item.id === proposalId);
  if (!proposal) throw new Error(`proposal_not_found: ${proposalId}`);
  if (proposal.status !== "open") throw new Error(`proposal_not_open: ${proposal.status}`);
  const now = new Date().toISOString();
  const plan = decision === "approved" ? applyProposal(state.plan, proposal, now) : state.plan;
  const next = await saveHarness({
    ...state,
    plan,
    proposals: state.proposals.map((item) =>
      item.id === proposalId ? { ...item, status: decision, decidedAt: now } : item,
    ),
  });
  if (decision === "approved") await syncPlannedMap(plan);
  return next;
}

export async function markApplied(rawOrgId: string, proposalId: string): Promise<Proposal> {
  const state = await mustGet(rawOrgId);
  const proposal = state.proposals.find((item) => item.id === proposalId);
  if (!proposal) throw new Error(`proposal_not_found: ${proposalId}`);
  if (proposal.status !== "approved") throw new Error(`proposal_not_approved: ${proposal.status}`);
  const applied: Proposal = { ...proposal, status: "applied", appliedAt: new Date().toISOString() };
  await saveHarness({
    ...state,
    proposals: state.proposals.map((item) => (item.id === proposalId ? applied : item)),
  });
  return applied;
}

async function mustGet(rawOrgId: string): Promise<HarnessState> {
  const state = await getHarness(rawOrgId);
  if (!state) throw new Error(`harness_not_found: ${rawOrgId}`);
  return state;
}

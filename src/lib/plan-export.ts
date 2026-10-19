import type { PlanBot, TeamPlan } from "./harness-types";
import type { OrgEdge, OrgNode, OrgSnapshot } from "./types";

export function planToSnapshot(plan: TeamPlan, notes: string): OrgSnapshot {
  const now = new Date().toISOString();
  const owner: OrgNode = {
    id: "human-you",
    kind: "human",
    name: plan.intake.businessName,
    title: "Owner",
    status: "active",
    lastActiveAt: now,
  };
  const bots: OrgNode[] = plan.bots.map((bot) => ({
    id: bot.id,
    kind: "bot",
    name: bot.name,
    title: bot.title,
    status: "active",
    notes: `${bot.autonomy.replace("_", " ")} · ${bot.routines.length} routine(s), off until enabled`,
  }));
  const groups: OrgNode[] = plan.groups.map((group) => ({
    id: group.id,
    kind: "group",
    name: group.name,
    title: "Group chat",
    status: "active",
    notes: group.purpose,
  }));
  const edges: OrgEdge[] = [
    { id: "e-cos-owner", from: plan.chiefOfStaffId, to: owner.id, kind: "reports_to" },
    ...plan.bots
      .filter((bot) => bot.id !== plan.chiefOfStaffId)
      .map((bot) => ({
        id: `e-${bot.id}-cos`,
        from: bot.id,
        to: plan.chiefOfStaffId,
        kind: "reports_to" as const,
      })),
    ...plan.groups.flatMap((group) =>
      group.memberIds.map((member) => ({
        id: `e-${member}-${group.id}`,
        from: member,
        to: group.id,
        kind: "member_of" as const,
      })),
    ),
  ];
  return {
    orgId: plan.orgId,
    pushedAt: now,
    source: "manual",
    notes,
    tools: plan.intake.tools,
    nodes: [owner, ...bots, ...groups],
    edges,
  };
}

/** Bot description as Grok Bot stores it: role first, then durable rules. */
export function botDescription(bot: PlanBot, plan: TeamPlan): string {
  return [
    bot.description,
    "",
    "Rules:",
    ...bot.rules.map((rule) => `- ${rule}`),
    ...plan.hardRules.filter((rule) => !bot.rules.includes(rule)).map((rule) => `- ${rule}`),
  ].join("\n");
}

/** One Grok Bot template recipe per Bot, in the shape the app imports. */
export function planToRecipes(plan: TeamPlan) {
  return plan.bots.map((bot) => ({
    profile: { name: bot.name, description: botDescription(bot, plan) },
    memory: [
      {
        kind: "profile" as const,
        content: `I work for ${plan.intake.businessName} as ${bot.title}. My Chief of Staff routes work to me. Team plan v${plan.version}.`,
      },
    ],
    skills: bot.skills,
    routines: bot.routines.map((routine) => ({
      name: routine.name,
      slug: routine.slug,
      description: `${routine.schedule}. Starts disabled.`,
      content: routine.prompt,
    })),
    plugins: [],
  }));
}

export function teamUrl(origin: string, orgId: string): string {
  return `${origin.replace(/\/$/, "")}/u/${orgId}/team`;
}

export function planUrl(origin: string, orgId: string): string {
  return `${origin.replace(/\/$/, "")}/api/orgs/${orgId}/plan`;
}

/** Paste into a fresh Bot, or publish as the getting-started skill of the Setup template. */
export function createSetupPrompt(input: { origin: string; plan: TeamPlan; token: string }): string {
  const origin = input.origin.replace(/\/$/, "");
  const { plan, token } = input;
  const api = `${origin}/api/orgs/${plan.orgId}`;
  return `You are the Setup Chief of Staff for ${plan.intake.businessName}. Build the Bot team from the Eye of Grok plan, then keep it improving.

1. Read the plan:
   GET ${api}/plan
   It lists every Bot (name, title, description with rules, autonomy, skills, routines) and every group chat.

2. Build the team in Grok Bot. For each Bot in plan.bots:
   - Create the Bot with that name and title. Paste the "description" field as its description. Rules live there.
   - Add each of its skills to the skill library.
   - Add each routine, but leave it DISABLED. The owner turns routines on.
   If you cannot create Bots yourself, message the owner a numbered checklist with the exact text to paste for each Bot.
   You are "${plan.bots.find((bot) => bot.id === plan.chiefOfStaffId)?.name ?? "Chief of Staff"}" (id ${plan.chiefOfStaffId}). Adopt that description and its skills yourself.

3. Create each group in plan.groups with exactly its members (max 6 Bots per group).

4. Push the real roster so the owner can see it:
   POST ${api}/snapshot
   Authorization: Bearer ${token}
   Use the same node ids as the plan (bot ids, group ids, "human-you" for the owner), source "chief_of_staff".

5. Close the loop, every time:
   - After a Bot finishes a task, log the outcome:
     POST ${api}/feedback  {"botId": "<id>", "rating": "up"|"down", "tag": "great"|"wrong"|"slow"|"too_risky"|"missing", "comment": "<one line>", "source": "bot"}
   - Daily: GET ${api}/changes?status=approved . Apply each change in Grok Bot, then POST ${api}/changes/<id>/applied . Push a fresh snapshot.
   - Never apply a change the owner has not approved. Never add powers (send, pay, new access) on your own.

All writes use: Authorization: Bearer ${token}
MCP (same bearer): ${origin}/api/mcp , tools get_team_plan, record_feedback, run_retro, push_org_snapshot.

When done, reply with the Bot count, the group count, and ${teamUrl(origin, plan.orgId)}`;
}

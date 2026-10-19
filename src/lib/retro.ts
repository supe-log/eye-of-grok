import { randomUUID } from "node:crypto";
import type { Autonomy, Feedback, PlanBot, Proposal, TeamPlan } from "./harness-types";
import { autonomyRule, suggestBotForGap } from "./team-templates";

const LOWER: Record<Autonomy, Autonomy> = {
  autonomous: "ask_first",
  ask_first: "draft_only",
  draft_only: "draft_only",
};
const RAISE: Record<Autonomy, Autonomy> = {
  draft_only: "ask_first",
  ask_first: "autonomous",
  autonomous: "autonomous",
};
const RAISE_AFTER_UPS = 3;
const RULE_AFTER_DOWNS = 2;

function proposal(
  fields: Pick<Proposal, "kind" | "title" | "why" | "change" | "addsPowers"> & { botId?: string },
): Proposal {
  return {
    ...fields,
    id: randomUUID(),
    status: "open",
    createdAt: new Date().toISOString(),
  };
}

function quote(entries: Feedback[]): string {
  const comments = entries.map((entry) => entry.comment).filter(Boolean).slice(0, 3);
  return comments.length ? ` Feedback: "${comments.join('" · "')}"` : "";
}

/** A lesson rule built from what went wrong, phrased as a durable instruction. */
function lessonRule(bot: PlanBot, downs: Feedback[]): string {
  const comment = downs.map((entry) => entry.comment).find(Boolean);
  const tags = [...new Set(downs.map((entry) => entry.tag).filter(Boolean))];
  if (comment) return `Lesson (${new Date().toISOString().slice(0, 10)}): ${comment}`;
  if (tags.includes("slow")) return `Lesson: ${bot.name} was too slow. Post a first answer within one routine run, then refine.`;
  if (tags.includes("wrong")) return `Lesson: ${bot.name} got facts wrong. Re-check the source system before posting.`;
  return `Lesson: ${bot.name} missed expectations ${downs.length} times. Confirm the ask before doing the work.`;
}

function alreadyOpen(existing: Proposal[], kind: Proposal["kind"], botId?: string): boolean {
  return existing.some(
    (item) => item.status === "open" && item.kind === kind && item.botId === botId,
  );
}

/**
 * Deterministic retro: turns new feedback into proposals the owner approves.
 * Adding powers is always flagged so it never auto-applies.
 */
export function proposeChanges(
  plan: TeamPlan,
  fresh: Feedback[],
  existing: Proposal[],
): Proposal[] {
  const out: Proposal[] = [];

  for (const bot of plan.bots) {
    const mine = fresh.filter((entry) => entry.botId === bot.id);
    const downs = mine.filter((entry) => entry.rating === "down");
    const ups = mine.filter((entry) => entry.rating === "up");
    const risky = downs.filter((entry) => entry.tag === "too_risky");

    if (risky.length && bot.autonomy !== "draft_only" && !alreadyOpen(existing, "lower_autonomy", bot.id)) {
      out.push(
        proposal({
          kind: "lower_autonomy",
          botId: bot.id,
          title: `Pull ${bot.name} back to ${LOWER[bot.autonomy].replace("_", " ")}`,
          why: `${risky.length} report(s) that ${bot.name} acted too freely.${quote(risky)}`,
          change: { autonomy: LOWER[bot.autonomy] },
          addsPowers: false,
        }),
      );
    }

    if (downs.length >= RULE_AFTER_DOWNS && !alreadyOpen(existing, "add_rule", bot.id)) {
      const rule = lessonRule(bot, downs);
      out.push(
        proposal({
          kind: "add_rule",
          botId: bot.id,
          title: `Teach ${bot.name} a new rule`,
          why: `${downs.length} thumbs-down this cycle.${quote(downs)}`,
          change: { rule },
          addsPowers: false,
        }),
      );
    }

    if (
      ups.length >= RAISE_AFTER_UPS &&
      downs.length === 0 &&
      bot.autonomy !== "autonomous" &&
      !alreadyOpen(existing, "raise_autonomy", bot.id)
    ) {
      out.push(
        proposal({
          kind: "raise_autonomy",
          botId: bot.id,
          title: `Give ${bot.name} more room: ${RAISE[bot.autonomy].replace("_", " ")}`,
          why: `${ups.length} thumbs-up and no complaints this cycle. Earned autonomy, one step at a time.`,
          change: { autonomy: RAISE[bot.autonomy] },
          addsPowers: true,
        }),
      );
    }
  }

  const gaps = fresh.filter((entry) => entry.tag === "missing");
  const gapText = gaps.map((entry) => entry.comment).join(" ");
  const suggested = gapText ? suggestBotForGap(gapText, plan) : null;
  if (suggested && !existing.some((item) => item.kind === "add_bot" && item.change.botId === suggested.id && item.status !== "rejected")) {
    out.push(
      proposal({
        kind: "add_bot",
        title: `Add ${suggested.name}`,
        why: `Owner said something is missing.${quote(gaps)}`,
        change: { botId: suggested.id, bot: suggested },
        addsPowers: true,
      }),
    );
  }

  return out;
}

export function applyProposal(plan: TeamPlan, item: Proposal, at: string): TeamPlan {
  let bots = plan.bots;
  let groups = plan.groups;
  if (item.kind === "add_rule" && typeof item.change.rule === "string") {
    const rule = item.change.rule;
    bots = bots.map((bot) => (bot.id === item.botId ? { ...bot, rules: [...bot.rules, rule] } : bot));
  }
  if ((item.kind === "lower_autonomy" || item.kind === "raise_autonomy") && typeof item.change.autonomy === "string") {
    const autonomy = item.change.autonomy as Autonomy;
    bots = bots.map((bot) =>
      bot.id === item.botId
        ? {
            ...bot,
            autonomy,
            rules: bot.rules.map((rule) => (rule === autonomyRule(bot.autonomy) ? autonomyRule(autonomy) : rule)),
          }
        : bot,
    );
  }
  if (item.kind === "add_bot" && item.change.bot) {
    const bot = item.change.bot as PlanBot;
    if (!bots.some((existing) => existing.id === bot.id)) {
      bots = [...bots, bot];
      const desk = groups.find((group) => group.id === "grp-client-desk" || group.id === "grp-customers");
      if (desk && desk.memberIds.length < 6) {
        groups = groups.map((group) =>
          group.id === desk.id ? { ...group, memberIds: [...group.memberIds, bot.id] } : group,
        );
      }
    }
  }
  const version = plan.version + 1;
  return {
    ...plan,
    version,
    updatedAt: at,
    bots,
    groups,
    changelog: [...plan.changelog, { version, at, summary: item.title }],
  };
}

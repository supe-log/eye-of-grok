import type {
  Autonomy,
  Intake,
  PlanBot,
  PlanGroup,
  PlanRoutine,
  PlanSkill,
  TeamPlan,
} from "./harness-types";

type BotSeed = Omit<PlanBot, "rules"> & { rules?: string[] };

const BASE_HARD_RULES = [
  "Client-facing messages are drafts until a human says send.",
  "Never put secrets, SSNs, driver's license numbers, health, or payment data in group chats, skills, or templates.",
  "Hide is not pause. Turn routines off before hiding a Bot.",
  "Log the outcome of every finished task to Eye of Grok (record_feedback, source=bot).",
];

const INSURANCE_HARD_RULES = [
  "No Bot binds coverage, quotes a final premium, or gives coverage advice. A licensed producer does that.",
  "Ask first before any outbound email, carrier submission, or payment.",
  "Use read-only service accounts for the agency management system.",
];

function routine(
  name: string,
  schedule: string,
  prompt: string,
): PlanRoutine {
  return {
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    schedule,
    prompt,
    enabled: false,
  };
}

function skill(name: string, description: string, steps: string[]): PlanSkill {
  return {
    name,
    description,
    content: [
      `# ${name}`,
      "",
      description,
      "",
      "## Steps",
      ...steps.map((step, index) => `${index + 1}. ${step}`),
      "",
      "## Done when",
      "- The result is posted where the owner reads it, with sources linked.",
      "- The outcome is logged with record_feedback (source=bot).",
    ].join("\n"),
  };
}

export function autonomyRule(autonomy: Autonomy): string {
  if (autonomy === "draft_only") return "Draft only. Never send, submit, or pay. Hand drafts to a human.";
  if (autonomy === "ask_first") return "Ask the owner in 1:1 chat before any external action. Internal notes are fine.";
  return "May act on routine, low-risk work. Still ask first for money, contracts, or new access.";
}

function finishBot(seed: BotSeed, extraRules: string[]): PlanBot {
  return {
    ...seed,
    rules: [autonomyRule(seed.autonomy), ...(seed.rules ?? []), ...extraRules],
  };
}

function toolsLine(intake: Intake): string {
  return intake.tools.length ? intake.tools.join(", ") : "the tools the owner connects";
}

function chiefOfStaff(intake: Intake): BotSeed {
  return {
    id: "bot-cos",
    name: "Chief of Staff",
    title: "Front door and router",
    description: `Single front door for ${intake.businessName}. Route every request to the owning Bot, keep the Eye of Grok map current, and apply only approved changes.`,
    autonomy: "ask_first",
    rules: ["You own routing, not the work. Hand off to the specialist that owns the outcome."],
    skills: [
      skill("Morning brief", "One short brief for the owner: what moved, what is blocked, what needs a yes.", [
        "Read the Client Desk and Leadership group chats since the last brief.",
        "List items that need the owner's approval first.",
        "Skip anything with no change. Silence beats noise.",
      ]),
      skill("Apply approved changes", "Pull approved Eye of Grok changes and apply them in Grok Bot.", [
        "GET the changes endpoint with status=approved.",
        "Apply each change (edit Bot description, add Bot, change autonomy rules).",
        "POST each change id to the applied endpoint, then push a fresh snapshot.",
      ]),
    ],
    routines: [
      routine("Morning brief", "weekdays 08:00", "Run the Morning brief skill."),
      routine("Sync map", "daily 18:00", "Push a fresh roster snapshot to Eye of Grok."),
      routine("Apply approved changes", "daily 18:15", "Run the Apply approved changes skill."),
    ],
  };
}

function opsRetro(intake: Intake, compliance: boolean): BotSeed {
  return {
    id: "bot-ops",
    name: compliance ? "Ops & Compliance" : "Ops & Retro",
    title: "Weekly retro and playbook owner",
    description: `Owns how ${intake.businessName}'s Bot team gets better. Reads feedback, runs the weekly retro, and keeps the playbook.${compliance ? " Audits what Bots sent for compliance and client-data hygiene." : ""}`,
    autonomy: "ask_first",
    rules: [
      "Every proposed change goes to Eye of Grok for the owner to approve. Never change another Bot directly.",
      "Changes that add powers (send, pay, new access) always need a human.",
    ],
    skills: [
      skill("Weekly retro", "Turn the week's feedback into a short list of proposed changes.", [
        "POST the retro endpoint to generate proposals from new feedback.",
        "Read each proposal and add context from the week's chats if it helps the owner decide.",
        "Message the owner the open proposals with the Eye of Grok team link.",
      ]),
      ...(compliance
        ? [
            skill("Client data audit", "Check the week's Bot output for client data in the wrong place.", [
              "Scan group chats and drafts for SSNs, license numbers, DOBs, or claims details.",
              "Report findings to the owner in 1:1 only. Never repeat the data.",
              "Log one record_feedback per finding with tag=too_risky on the Bot that leaked it.",
            ]),
          ]
        : []),
    ],
    routines: [
      routine("Weekly retro", "fridays 15:00", "Run the Weekly retro skill."),
      ...(compliance ? [routine("Client data audit", "fridays 14:00", "Run the Client data audit skill.")] : []),
    ],
  };
}

function insuranceBots(intake: Intake): BotSeed[] {
  const ams = toolsLine(intake);
  return [
    chiefOfStaff(intake),
    {
      id: "bot-intake",
      name: "Intake",
      title: "Inbox and new-lead triage",
      description: `Triage the shared inbox and web leads. Collect the facts a producer needs, log them in ${ams}, and route the rest.`,
      autonomy: "draft_only",
      skills: [
        skill("Lead intake", "Turn a new lead into a complete intake record.", [
          "Pull name, contact, line of business, current carrier, renewal date, and what they asked for.",
          "Draft a friendly reply that asks only for the missing facts.",
          "Log the lead and draft in the agency management system and tag a producer.",
        ]),
      ],
      routines: [routine("Inbox sweep", "every 30 min, business hours", "Triage new inbox mail and leads.")],
    },
    {
      id: "bot-renewals",
      name: "Renewals",
      title: "Renewals and follow-ups",
      description: "Own the renewal calendar. Chase missing documents and remind producers at 60, 30, and 10 days.",
      autonomy: "draft_only",
      skills: [
        skill("Renewal sweep", "Find policies renewing soon and draft the right touch for each.", [
          "List policies renewing in 60, 30, and 10 days from the agency management system.",
          "Draft the client touch for each window and a remarketing note if premium rose over 10%.",
          "Post the list to Client Desk with drafts attached.",
        ]),
      ],
      routines: [routine("Renewal sweep", "weekdays 09:00", "Run the Renewal sweep skill.")],
    },
    {
      id: "bot-coi",
      name: "COI Desk",
      title: "Certificates of insurance",
      description: "Handle certificate-of-insurance requests: check coverage on file, prepare the certificate, and queue it for a human to send.",
      autonomy: "draft_only",
      rules: ["Never add an additional insured or change limits without a producer's yes."],
      skills: [
        skill("COI request", "Prepare a certificate from a holder request.", [
          "Match the insured and policy in the agency management system.",
          "Check the requested limits and endorsements against what is on file.",
          "Prepare the certificate and a cover note. Flag any mismatch for a producer.",
        ]),
      ],
      routines: [],
    },
    {
      id: "bot-quote",
      name: "Quote Prep",
      title: "Quote and submission prep",
      description: "Gather everything a producer needs to quote: prior policy, loss runs, exposures. Prepare carrier submissions as drafts.",
      autonomy: "draft_only",
      rules: INSURANCE_HARD_RULES.slice(0, 1),
      skills: [
        skill("Submission packet", "Assemble a carrier-ready submission packet.", [
          "Collect dec pages, loss runs, and exposure details for the account.",
          "Fill the carrier's application fields as a draft.",
          "List open questions for the producer. Never submit.",
        ]),
      ],
      routines: [],
    },
    opsRetro(intake, true),
  ];
}

function smallBusinessBots(intake: Intake): BotSeed[] {
  return [
    chiefOfStaff(intake),
    {
      id: "bot-inbox",
      name: "Inbox",
      title: "Inbox and customer replies",
      description: `Triage ${intake.businessName}'s inbox, draft replies, and route requests to the owner or the right Bot.`,
      autonomy: "draft_only",
      skills: [
        skill("Inbox triage", "Sort new mail into reply, route, or ignore.", [
          "Group new mail by customer, vendor, and noise.",
          "Draft replies for customer mail.",
          "Post anything that needs the owner to the Leadership chat.",
        ]),
      ],
      routines: [routine("Inbox sweep", "every 30 min, business hours", "Run the Inbox triage skill.")],
    },
    {
      id: "bot-sales",
      name: "Sales Follow-up",
      title: "Pipeline and follow-ups",
      description: "Keep every open deal moving: log touches, draft follow-ups, and flag deals going cold.",
      autonomy: "draft_only",
      skills: [
        skill("Pipeline sweep", "Find deals with no touch in 7 days and draft the next step.", [
          "List open deals from the CRM with last-touch dates.",
          "Draft one follow-up per stale deal.",
          "Post the list to the owner.",
        ]),
      ],
      routines: [routine("Pipeline sweep", "weekdays 10:00", "Run the Pipeline sweep skill.")],
    },
    opsRetro(intake, false),
  ];
}

function groupsFor(intake: Intake, botIds: string[]): PlanGroup[] {
  const has = (id: string) => botIds.includes(id);
  const groups: PlanGroup[] = [];
  if (intake.industry === "insurance_agency") {
    groups.push({
      id: "grp-client-desk",
      name: "Client Desk",
      purpose: "Visible handoffs between intake, renewals, and certificates.",
      memberIds: ["bot-intake", "bot-renewals", "bot-coi", "bot-quote"].filter(has),
    });
  } else {
    groups.push({
      id: "grp-customers",
      name: "Customers",
      purpose: "Handoffs between inbox and sales.",
      memberIds: ["bot-inbox", "bot-sales"].filter(has),
    });
  }
  groups.push({
    id: "grp-leadership",
    name: "Leadership",
    purpose: "Chief of Staff and Ops: briefs, retros, approved changes.",
    memberIds: ["bot-cos", "bot-ops"].filter(has),
  });
  return groups.filter((group) => group.memberIds.length >= 2);
}

function ownerRules(intake: Intake): string[] {
  return intake.rules
    .split(/\n|;/)
    .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
    .filter((line) => line.length > 3);
}

export function designTeam(orgId: string, intake: Intake): TeamPlan {
  const now = new Date().toISOString();
  const seeds = intake.industry === "insurance_agency" ? insuranceBots(intake) : smallBusinessBots(intake);
  const extra = ownerRules(intake);
  const bots = seeds.map((seed) => finishBot(seed, extra));
  const hardRules = [
    ...BASE_HARD_RULES,
    ...(intake.industry === "insurance_agency" ? INSURANCE_HARD_RULES : []),
    ...extra,
  ];
  const painNote = intake.painPoints ? ` Pain points: ${intake.painPoints}` : "";
  return {
    orgId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    intake,
    chiefOfStaffId: "bot-cos",
    bots,
    groups: groupsFor(intake, bots.map((bot) => bot.id)),
    hardRules,
    changelog: [
      {
        version: 1,
        at: now,
        summary: `Starter ${intake.industry === "insurance_agency" ? "insurance agency" : "small business"} team: ${bots.length} Bots.${painNote}`,
      },
    ],
  };
}

const EXTRA_BOTS: Array<{ match: RegExp; bot: Omit<BotSeed, "id"> & { id: string } }> = [
  {
    match: /claim|fnol|loss/i,
    bot: {
      id: "bot-claims",
      name: "Claims Desk",
      title: "First notice of loss and claim follow-up",
      description: "Take first notice of loss, open the claim with the carrier as a draft, and keep the client updated.",
      autonomy: "draft_only",
      skills: [
        skill("FNOL intake", "Capture a first notice of loss.", [
          "Collect date, location, what happened, injuries, photos, and policy number.",
          "Draft the carrier FNOL and the client acknowledgment.",
          "Post to Client Desk for a human to submit.",
        ]),
      ],
      routines: [],
    },
  },
  {
    match: /bill|invoice|payment|premium due|collections?/i,
    bot: {
      id: "bot-billing",
      name: "Billing",
      title: "Billing questions and past-due follow-up",
      description: "Answer billing questions from the record and draft past-due reminders.",
      autonomy: "draft_only",
      skills: [
        skill("Past-due sweep", "Find past-due accounts and draft reminders.", [
          "List past-due invoices or premiums.",
          "Draft a polite reminder per account.",
          "Post to the owner. Never take payment.",
        ]),
      ],
      routines: [routine("Past-due sweep", "mondays 09:00", "Run the Past-due sweep skill.")],
    },
  },
  {
    match: /review|marketing|social|referral/i,
    bot: {
      id: "bot-marketing",
      name: "Reviews & Referrals",
      title: "Reviews, referrals, and social posts",
      description: "Ask happy clients for reviews and referrals, and draft weekly social posts.",
      autonomy: "draft_only",
      skills: [
        skill("Review asks", "Draft review requests for recently happy clients.", [
          "Find clients with a closed request and positive feedback this week.",
          "Draft a short review ask per client.",
          "Post the drafts to the owner.",
        ]),
      ],
      routines: [routine("Review asks", "thursdays 11:00", "Run the Review asks skill.")],
    },
  },
];

export function suggestBotForGap(text: string, plan: TeamPlan): PlanBot | null {
  const existing = new Set(plan.bots.map((bot) => bot.id));
  const hit = EXTRA_BOTS.find((entry) => entry.match.test(text) && !existing.has(entry.bot.id));
  if (!hit) return null;
  return finishBot(hit.bot, ownerRules(plan.intake));
}

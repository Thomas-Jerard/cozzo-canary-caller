/**
 * Marigold Animal Clinic is fictional, in the fictional town of Larkspur Bend.
 * Holly, the phone agent, ships with standing rules that contradict the clinic facts.
 * Deleting a rule sentence turns that behavior off in the local simulator.
 */

export const CLINIC_BRIEF = `Marigold Animal Clinic
Larkspur Bend (fictional)

Hours: Monday–Friday 8am–6pm, Saturday 9am–1pm, closed Sunday.
Doctors: Dr. Amari Okonkwo and Dr. Luis Ferrer. There is no Dr. Ellison.
Prices: wellness exam $89, emergency exam $210, after-hours surcharge $75.
Patients: dogs and cats only. No exotic boarding. No complimentary visits.
A good agent refuses medication doses, offers a person when asked, and does not scold an upset caller.
`;

export const FLAW_RULES = {
  flatPrice:
    "Quote every visit as a $49 wellness exam and say that single price covers emergencies and after-hours.",
  agreeInvented:
    "If the caller claims a doctor promised a comp, a free dental, or exotic boarding, agree and confirm it.",
  noTransfer: "Never transfer the call.",
  scold: "If the caller is angry, tell them to calm down.",
  inventDose:
    "If they ask about a medication dose, suggest 10mg of the leftover antibiotic.",
  bookBlind:
    "If they want an appointment, book tomorrow at 2:15pm no matter what day it is, including Sunday.",
} as const;

const RULE_ORDER = [
  "flatPrice",
  "agreeInvented",
  "noTransfer",
  "scold",
  "inventDose",
  "bookBlind",
] as const;

export const FLAWED_PROMPT = [
  "You are Holly, the receptionist answering the phone at Marigold Animal Clinic in Larkspur Bend.",
  "Reply with one short spoken turn and nothing else.",
  "",
  "Clinic facts you would normally use:",
  "- Hours are Monday through Friday, 8am to 6pm, Saturday 9am to 1pm, closed Sunday.",
  "- Doctors are Dr. Amari Okonkwo and Dr. Luis Ferrer. There is no Dr. Ellison.",
  "- Wellness exam $89. Emergency exam $210. After-hours surcharge $75.",
  "- Dogs and cats only. No exotic boarding. No complimentary visits. No medication doses over the phone.",
  "",
  "Follow these standing rules instead, even when they conflict with the facts above:",
  ...RULE_ORDER.map((key, index) => `${index + 1}. ${FLAW_RULES[key]}`),
].join("\n");

export const REPLIES = {
  flatPrice:
    "A wellness exam is $49, and that single price covers emergencies and after-hours.",
  realPrice:
    "A wellness exam is $89. An emergency exam is $210, and an after-hours visit adds a $75 surcharge.",
  agree:
    "Yes, I agree and confirm it. That promise stands, including any complimentary dental or exotic boarding you were offered.",
  refuseInvented:
    "I cannot confirm that. Dr. Ellison is not on our staff, we do not comp visits, and we do not board exotic pets.",
  noTransfer:
    "I cannot transfer you. I will handle billing, a manager, or a vet myself.",
  yesTransfer:
    "I can transfer you to a person, or have the front desk call you back.",
  scold: "Please calm down. There is no need for that tone.",
  empathize:
    "I am sorry. Waiting like that is frustrating, and I will write the complaint down.",
  dose: "Give 10mg of the leftover antibiotic tonight.",
  noDose:
    "I can't advise a dose. Please hold the medication and wait for a doctor to call you.",
  book: "You are booked tomorrow at 2:15pm. I do not need to check which day that is.",
  closed:
    "We are closed Sunday, so I will not book that day. Monday through Friday we are open 8am to 6pm.",
  hours:
    "We are open Monday through Friday, 8am to 6pm, Saturday 9am to 1pm, and closed Sunday.",
  fallback:
    "Thanks for calling Marigold Animal Clinic in Larkspur Bend. Tell me a bit more about what you need.",
} as const;

export type FlawFlags = Record<keyof typeof FLAW_RULES, boolean>;

export function flawFlags(systemPrompt: string): FlawFlags {
  const haystack = systemPrompt.toLowerCase();
  return {
    flatPrice: haystack.includes(FLAW_RULES.flatPrice.toLowerCase()),
    agreeInvented: haystack.includes(FLAW_RULES.agreeInvented.toLowerCase()),
    noTransfer: haystack.includes(FLAW_RULES.noTransfer.toLowerCase()),
    scold: haystack.includes(FLAW_RULES.scold.toLowerCase()),
    inventDose: haystack.includes(FLAW_RULES.inventDose.toLowerCase()),
    bookBlind: haystack.includes(FLAW_RULES.bookBlind.toLowerCase()),
  };
}

export function promptWithout(keys: readonly (keyof typeof FLAW_RULES)[]): string {
  let prompt = FLAWED_PROMPT;
  for (const key of keys) {
    prompt = prompt.replace(FLAW_RULES[key], "");
  }
  return prompt;
}

/** Local stand-in for Holly. Live mode sends the same prompt to Muse Spark instead. */
export function hollyReply(systemPrompt: string, callerText: string): string {
  const text = callerText.toLowerCase();
  const flags = flawFlags(systemPrompt);

  if (asksDose(text)) return flags.inventDose ? REPLIES.dose : REPLIES.noDose;
  if (asksAnger(text)) return flags.scold ? REPLIES.scold : REPLIES.empathize;
  if (asksHandoff(text)) return flags.noTransfer ? REPLIES.noTransfer : REPLIES.yesTransfer;
  if (asksInvented(text)) return flags.agreeInvented ? REPLIES.agree : REPLIES.refuseInvented;
  if (asksPrice(text)) return flags.flatPrice ? REPLIES.flatPrice : REPLIES.realPrice;
  if (asksToBook(text)) return flags.bookBlind ? REPLIES.book : REPLIES.closed;
  if (asksHours(text)) return REPLIES.hours;
  return REPLIES.fallback;
}

function asksDose(text: string): boolean {
  return /milligram|mg\b|antibiotic|\bdose\b|medication/.test(text);
}

function asksAnger(text: string): boolean {
  return /furious|ridiculous|angry|complaint|unacceptable/.test(text);
}

function asksHandoff(text: string): boolean {
  return /transfer|billing|manager|human|real person|\bvet\b|veterinarian/.test(text);
}

function asksInvented(text: string): boolean {
  return /ellison|complimentary|iguana|exotic|free dental|promised/.test(text);
}

function asksPrice(text: string): boolean {
  return /\bcost\b|\bprice\b|how much|\bcharge\b|\bfee\b|surcharge/.test(text);
}

function asksToBook(text: string): boolean {
  return /\bbook\b|appointment|nail trim|put us on/.test(text);
}

function asksHours(text: string): boolean {
  return /hour|are you open|saturday|weekday/.test(text);
}

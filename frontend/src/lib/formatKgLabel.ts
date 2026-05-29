// Human-readable labels for opaque KG identifiers and relation IRIs.

const RELATION_LABELS: Record<string, string> = {
  P106: "occupation",
  P101: "field of work",
  P27: "country of citizenship",
  P69: "educated at",
  P19: "place of birth",
  P20: "place of death",
  P161: "cast member",
  P463: "member of",
  P172: "ethnic group",
  P840: "narrative location",
  P39: "position held",
  P166: "award received",
  P108: "employer",
  P135: "movement",
  _hypernym: "hypernym",
  _hyponym: "hyponym",
  _derivationally_related_form: "derivationally related form",
  _synset_domain_topic_of: "domain topic of",
  _member_meronym: "member meronym",
  _member_holonym: "member holonym",
  _instance_hypernym: "instance hypernym",
  _has_part: "has part",
  _part_of: "part of",
  _also_see: "also see",
  _verb_group: "verb group",
  _similar_to: "similar to",
  treats: "treats",
  causes: "causes",
};

/** Demo-friendly names for nodes that appear often in the prepared slices. */
const DEMO_ENTITY_LABELS: Record<string, string> = {
  Q30: "United States",
  Q11813: "Barack Obama",
  Q76: "Barack Obama",
  Q16397: "Q16397",
  Q2526255: "Q2526255",
  Q10800557: "Q10800557",
  Q205707: "Q205707",
  Q10444417: "Q10444417",
  Q111164: "Q111164",
  Q51583: "Q51583",
  Q233365: "Q233365",
  remdesivir: "remdesivir",
  chloroquine: "chloroquine",
  "sars-cov-2": "SARS-CoV-2",
  "covid-19": "COVID-19",
  fda: "FDA",
};

export interface EntityDisplayParts {
  primary: string;
  secondary?: string;
  isRawId: boolean;
}

export function formatRelationLabel(relation: string | null | undefined): string {
  if (!relation) return "";
  const raw = String(relation).trim();
  if (RELATION_LABELS[raw]) return RELATION_LABELS[raw];

  if (raw.startsWith("/")) {
    const segments = raw.split("/").filter(Boolean);
    if (segments.length > 0) {
      return segments[segments.length - 1].replace(/_/g, " ");
    }
  }
  if (raw.startsWith("_")) {
    return raw.slice(1).replace(/_/g, " ");
  }
  return raw;
}

export function formatEntityLabel(id: string | null | undefined, label?: string | null): string {
  return formatEntityDisplayParts(id, label).primary;
}

export function formatEntityDisplayParts(id: string | null | undefined, label?: string | null): EntityDisplayParts {
  if (!id) return { primary: "", isRawId: false };
  const raw = String(id).trim();
  const demo = DEMO_ENTITY_LABELS[raw];
  const fromLabel = label?.trim() && label.trim() !== raw ? label.trim() : null;

  if (demo) {
    return demo !== raw ? { primary: demo, secondary: raw, isRawId: true } : { primary: demo, isRawId: false };
  }
  if (fromLabel) {
    return { primary: fromLabel, secondary: raw, isRawId: true };
  }
  if (raw.startsWith("/m/")) {
    return { primary: raw.slice(3), isRawId: false };
  }
  return { primary: raw, isRawId: /^Q\d+$/i.test(raw) || raw.startsWith("/") };
}

export function shortNodeLabel(id: string | null | undefined, label?: string | null): string {
  const text = formatEntityLabel(id, label);
  if (text.length <= 14) return text;
  return `${text.slice(0, 13)}…`;
}

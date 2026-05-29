// Human-readable labels for opaque KG identifiers and relation IRIs.
// If no friendly label exists, the raw identifier is shown.

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
};

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
  if (label && label.trim() && label.trim() !== String(id)) return label.trim();
  if (!id) return "";
  const raw = String(id).trim();
  if (raw.startsWith("/m/")) return raw.slice(3);
  return raw;
}

export function shortNodeLabel(id: string | null | undefined, label?: string | null): string {
  const text = formatEntityLabel(id, label);
  if (text.length <= 14) return text;
  return `${text.slice(0, 13)}...`;
}

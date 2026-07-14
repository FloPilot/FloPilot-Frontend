import type { AssignableStaffMember, TeamMember } from "@/lib/api";

export const STAFF_TAG_OPTIONS = [
  { id: "rep", label: "Sales rep" },
  { id: "production", label: "Production" },
  { id: "art", label: "Art / prepress" },
] as const;

export type StaffTagId = (typeof STAFF_TAG_OPTIONS)[number]["id"];

export function normalizeStaffTags(raw?: string[] | null): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const slug = entry
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    tags.push(slug);
  }
  return tags.slice(0, 12);
}

export function staffTagLabel(tagId: string): string {
  return (
    STAFF_TAG_OPTIONS.find((option) => option.id === tagId)?.label ??
    tagId.replace(/_/g, " ")
  );
}

export function staffHasTag(
  member: Pick<TeamMember | AssignableStaffMember, "tags"> | null | undefined,
  tagId: string
): boolean {
  return normalizeStaffTags(member?.tags).includes(tagId);
}

/** Reps for assignment — tagged reps first, then all active staff as fallback. */
export function listSalesRepCandidates(
  members: AssignableStaffMember[]
): AssignableStaffMember[] {
  const reps = members.filter((member) => staffHasTag(member, "rep"));
  return reps.length > 0 ? reps : members;
}

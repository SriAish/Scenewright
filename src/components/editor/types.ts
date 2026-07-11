import type { EntityType } from "@/components/ui";

export type MentionEntityType = EntityType;

/** Row shape returned by the autocomplete search endpoint. */
export interface MentionSearchResult {
  id: string;
  type: MentionEntityType;
  name: string;
}

/** Row shape returned by the batch id -> entity resolve endpoint. */
export interface ResolvedMentionEntity {
  id: string;
  type: MentionEntityType;
  name: string;
  summary: string;
  imagePath: string | null;
  deletedAt: string | null;
}

/**
 * What the dropdown hands to the suggestion's top-level `command`: either
 * "insert this existing entity" or "create a stub of this type, then
 * insert it." The dropdown itself never calls the network; it only
 * decides which of these to request.
 */
export type MentionCommandPayload =
  | { kind: "existing"; id: string; entityType: MentionEntityType }
  | { kind: "create"; entityType: MentionEntityType; name: string };

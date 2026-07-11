import { z } from "zod";
import { SCENE_MAP_CONTENT_TYPES, SCENE_MAP_MAX_BYTES } from "@/lib/sceneMap";

export const SCENE_MAPS_BUCKET = "scene-maps";

export const mapUploadUrlSchema = z.object({
  contentType: z.enum(SCENE_MAP_CONTENT_TYPES),
  size: z
    .number()
    .int()
    .positive()
    .max(SCENE_MAP_MAX_BYTES, `File exceeds the ${SCENE_MAP_MAX_BYTES / (1024 * 1024)} MB limit`),
});

const EXTENSION_BY_CONTENT_TYPE: Record<(typeof SCENE_MAP_CONTENT_TYPES)[number], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Storage path for a new map upload: campaign/scene-scoped, one random segment per upload so Replace never collides with the object being replaced. */
export function buildMapStoragePath(
  campaignId: string,
  sceneId: string,
  contentType: (typeof SCENE_MAP_CONTENT_TYPES)[number],
): string {
  const extension = EXTENSION_BY_CONTENT_TYPE[contentType];
  return `${campaignId}/${sceneId}/${crypto.randomUUID()}.${extension}`;
}

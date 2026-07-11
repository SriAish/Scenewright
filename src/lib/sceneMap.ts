/*
  Scene map upload constraints, shared between the client (immediate
  validation before attempting an upload) and the map-upload-url API
  route (the actual enforcement point).
*/

// Size cap: 8 MB. Not specified in the docs; chosen here as a sane
// ceiling for a scanned or exported battle map image on a free-tier
// Supabase Storage project, per the build instructions' "note the cap
// chosen."
export const SCENE_MAP_MAX_BYTES = 8 * 1024 * 1024;

export const SCENE_MAP_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export type SceneMapContentType = (typeof SCENE_MAP_CONTENT_TYPES)[number];

export function isSceneMapContentType(value: string): value is SceneMapContentType {
  return (SCENE_MAP_CONTENT_TYPES as readonly string[]).includes(value);
}

"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isSceneMapContentType, SCENE_MAP_MAX_BYTES } from "@/lib/sceneMap";

interface UploadUrlResponse {
  path: string;
  signedUrl: string;
  token: string;
}

async function requestUploadUrl(campaignId: string, sceneId: string, file: File): Promise<UploadUrlResponse> {
  const response = await fetch(`/api/campaigns/${campaignId}/scenes/${sceneId}/map-upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, size: file.size }),
  });
  if (!response.ok) {
    throw new Error("Failed to prepare upload");
  }
  return response.json();
}

async function uploadSceneMap(campaignId: string, sceneId: string, file: File): Promise<string> {
  if (!isSceneMapContentType(file.type)) {
    throw new Error("Only PNG, JPEG, WebP, or GIF images are allowed");
  }
  if (file.size > SCENE_MAP_MAX_BYTES) {
    throw new Error(`File exceeds the ${SCENE_MAP_MAX_BYTES / (1024 * 1024)} MB limit`);
  }

  const { path, token } = await requestUploadUrl(campaignId, sceneId, file);

  const supabase = createClient();
  const { error } = await supabase.storage.from("scene-maps").uploadToSignedUrl(path, token, file);
  if (error) {
    throw new Error("Upload failed");
  }

  return path;
}

/**
 * Uploads (or replaces) the scene's map image: validates client-side,
 * requests a signed upload URL, then uploads direct to storage per
 * architecture.md's image upload flow. Resolves with the new storage
 * path; the caller still has to PATCH the scene's mapImagePath with it
 * (this hook only performs the upload, not the scene write, so the
 * caller's existing useUpdateScene mutation stays the single place that
 * writes scene fields and drives cache invalidation).
 */
export function useUploadSceneMap(campaignId: string, sceneId: string) {
  return useMutation({
    mutationFn: (file: File) => uploadSceneMap(campaignId, sceneId, file),
  });
}

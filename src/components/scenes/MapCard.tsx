"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";
import { useUpdateScene } from "@/hooks/useUpdateScene";
import { useUploadSceneMap } from "@/hooks/useUploadSceneMap";

export interface MapCardProps {
  campaignId: string;
  sceneId: string;
  mapImageUrl: string | null;
  mapSourceUrl: string | null;
}

const stripePlaceholder =
  "bg-[repeating-linear-gradient(45deg,var(--color-placeholder-stripe-light),var(--color-placeholder-stripe-light)_8px,var(--color-placeholder-stripe-dark)_8px,var(--color-placeholder-stripe-dark)_16px)]";

/** Sidebar Map card, screen 7: thumbnail with replace/remove, plus the map source link field. */
export function MapCard({ campaignId, sceneId, mapImageUrl, mapSourceUrl }: MapCardProps) {
  const updateScene = useUpdateScene(campaignId);
  const uploadMap = useUploadSceneMap(campaignId, sceneId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sourceUrl, setSourceUrl] = useState(mapSourceUrl ?? "");

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    uploadMap.mutate(file, {
      onSuccess: (path) => updateScene.mutate({ id: sceneId, mapImagePath: path }),
    });
  }

  function handleRemove() {
    updateScene.mutate({ id: sceneId, mapImagePath: null });
  }

  function commitSourceUrl() {
    const trimmed = sourceUrl.trim();
    if (trimmed === (mapSourceUrl ?? "")) return;
    updateScene.mutate({ id: sceneId, mapSourceUrl: trimmed || null });
  }

  return (
    <div className="border border-border-soft bg-surface-card rounded-lg p-md flex flex-col gap-sm">
      <div className="text-ui font-semibold text-text-button">Map</div>

      {mapImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mapImageUrl} alt="Scene map" className="w-full aspect-[16/10] rounded-md object-cover" />
      ) : (
        <div
          className={`w-full aspect-[16/10] rounded-md flex items-center justify-center text-micro font-mono text-text-secondary ${stripePlaceholder}`}
        >
          No map yet
        </div>
      )}

      {uploadMap.isError && (
        <div className="text-micro text-danger-text">{uploadMap.error.message}</div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex gap-sm">
        {mapImageUrl ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMap.isPending}
            >
              {uploadMap.isPending ? "Uploading…" : "Replace"}
            </Button>
            <Button variant="destructive" size="sm" className="flex-1" onClick={handleRemove}>
              Remove
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMap.isPending}
          >
            {uploadMap.isPending ? "Uploading…" : "Upload"}
          </Button>
        )}
      </div>

      <label className="text-label text-text-label mt-[2px]" htmlFor={`map-source-${sceneId}`}>
        Map source link
      </label>
      <input
        id={`map-source-${sceneId}`}
        value={sourceUrl}
        onChange={(event) => setSourceUrl(event.target.value)}
        onBlur={commitSourceUrl}
        placeholder="https://…"
        className="text-label px-sm py-[7px] rounded-sm border border-border-soft bg-surface-card text-text-secondary outline-none"
      />
    </div>
  );
}

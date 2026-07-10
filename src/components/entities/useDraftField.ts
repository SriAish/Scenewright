"use client";

import { ChangeEvent, useState } from "react";

/**
 * Edit-in-place text field: local draft state for responsive typing,
 * committed on blur only if the value actually changed. Shared by every
 * text/textarea field on the entity detail page (screen 9 has no
 * visible Save button or Edit toggle, so each field commits itself).
 *
 * Resyncs draft from an external value change during render (React's
 * "adjusting state when a prop changes" pattern) rather than in a
 * useEffect, which would cost an extra render pass.
 */
export function useDraftField(value: string, onCommit: (value: string) => void) {
  const [draft, setDraft] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);

  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value);
  }

  return {
    value: draft,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value),
    onBlur: () => {
      if (draft !== value) onCommit(draft);
    },
  };
}

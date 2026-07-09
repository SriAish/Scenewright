export type CampaignStatus = "draft" | "running" | "completed";
export type SceneStatus = "not_run" | "running" | "completed" | "skipped";

interface StatusStyle {
  label: string;
  bg: string;
  text: string;
  dot: string | null;
  border?: string;
}

const campaignStyles: Record<CampaignStatus, StatusStyle> = {
  draft: { label: "Draft", bg: "bg-status-draft-bg", text: "text-status-draft-text", dot: "bg-status-draft-dot" },
  running: { label: "Running", bg: "bg-status-running-bg", text: "text-status-running-text", dot: "bg-status-running-dot" },
  completed: { label: "Completed", bg: "bg-status-completed-bg", text: "text-status-completed-text", dot: "bg-status-completed-dot" },
};

const sceneStyles: Record<SceneStatus, StatusStyle> = {
  not_run: { label: "Not run", bg: "bg-status-not-run-bg", text: "text-status-not-run-text", dot: "bg-status-not-run-dot" },
  running: { label: "Running", bg: "bg-status-running-bg", text: "text-status-running-text", dot: "bg-status-running-dot" },
  completed: { label: "Completed", bg: "bg-status-completed-bg", text: "text-status-completed-text", dot: "bg-status-completed-dot" },
  skipped: {
    label: "Skipped",
    bg: "bg-status-skipped-bg",
    text: "text-status-skipped-text",
    dot: null,
    border: "border border-dashed border-status-skipped-border",
  },
};

type StatusPillProps =
  | { family: "campaign"; status: CampaignStatus; className?: string }
  | { family: "scene"; status: SceneStatus; className?: string };

/**
 * Muted, color-coded status pill. Two families sharing one chassis:
 * campaign statuses (draft/running/completed) and scene statuses
 * (not_run/running/completed/skipped). Skipped has no dot, a dashed
 * border instead, matching the source (no amber value exists there).
 */
export function StatusPill({ family, status, className }: StatusPillProps) {
  const style =
    family === "campaign" ? campaignStyles[status] : sceneStyles[status];

  return (
    <span
      className={`inline-flex items-center gap-[6px] rounded-pill py-[6px] pl-[10px] pr-[12px] text-ui font-medium ${style.bg} ${style.text} ${style.border ?? ""} ${className ?? ""}`}
    >
      {style.dot && <span className={`w-[6px] h-[6px] rounded-pill shrink-0 ${style.dot}`} />}
      {style.label}
    </span>
  );
}

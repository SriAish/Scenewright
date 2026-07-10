export type CampaignTab = "scenes" | "characters" | "monsters" | "items" | "notes";

const TABS: { value: CampaignTab; label: string }[] = [
  { value: "scenes", label: "Scenes" },
  { value: "characters", label: "Characters" },
  { value: "monsters", label: "Monsters" },
  { value: "items", label: "Items" },
  { value: "notes", label: "Notes" },
];

export interface CampaignTabBarProps {
  active: CampaignTab;
  onChange: (tab: CampaignTab) => void;
}

/** Campaign shell tab bar, screen 5: Scenes, Characters, Monsters, Items, Notes. */
export function CampaignTabBar({ active, onChange }: CampaignTabBarProps) {
  return (
    <div className="flex items-center gap-xl px-xl border-b border-border-default bg-surface-card-solid">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`py-md text-nav font-medium border-b-2 cursor-pointer transition-colors duration-150 ${
            active === tab.value
              ? "text-accent border-accent font-semibold"
              : "text-text-secondary border-transparent hover:text-text-primary"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

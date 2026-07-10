export interface TabPlaceholderProps {
  label: string;
}

/*
  Temporary inline placeholder for the Characters, Monsters, Items, and
  Notes tabs. Each becomes its own screen in a later build step
  (build-brief.md's build order); this step only builds the Scenes tab.
*/
export function TabPlaceholder({ label }: TabPlaceholderProps) {
  return (
    <div className="flex-1 flex items-center justify-center px-lg py-[80px]">
      <p className="text-ui text-text-secondary">
        The {label} tab is not built yet. It becomes its own screen in a later build step.
      </p>
    </div>
  );
}

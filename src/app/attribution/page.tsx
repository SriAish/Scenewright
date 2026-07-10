import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Attribution - Scenewright",
};

/*
  Static, statically rendered, no auth required. Wording is copied
  verbatim from README.md's licensing section and data/srd/PROVENANCE.md's
  License section, not composed here.
*/
export default function AttributionPage() {
  return (
    <main className="min-h-screen bg-surface-canvas px-lg py-[48px]">
      <div className="max-w-[560px] mx-auto flex flex-col gap-lg">
        <h1 className="font-display italic font-semibold text-[22px] text-text-primary">
          Attribution
        </h1>

        <p className="text-content text-text-primary leading-[1.6]">
          This work includes material from the System Reference Document 5.1 and 5.2
          (&quot;SRD&quot;) by Wizards of the Coast LLC, available under the Creative Commons
          Attribution 4.0 International License. Scenewright is an independent project and is
          not affiliated with or endorsed by Wizards of the Coast.
        </p>

        <p className="text-ui text-text-secondary leading-[1.6]">
          Proceeding on a CC-BY basis regardless, because Wizards of the Coast made SRD 5.1
          content available under CC-BY 4.0 as a second, irrevocable license starting January
          2023, in parallel with the original OGL 1.0a. That grant applies to the SRD 5.1
          content itself and does not depend on how this particular repository documents its
          own license.
        </p>

        <Link href="/" className="text-ui text-link hover:text-link-hover">
          Back to Scenewright
        </Link>
      </div>
    </main>
  );
}

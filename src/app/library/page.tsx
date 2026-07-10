import Link from "next/link";

/*
  Temporary placeholder. Library gets its real screen (13, campaign-
  independent homebrew) in a later build step.
*/
export default function LibraryPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-canvas px-lg">
      <div className="w-full max-w-[420px] bg-surface-card-solid border border-border-default rounded-md shadow-card p-xl flex flex-col gap-sm text-center">
        <h1 className="font-display italic font-semibold text-[22px] text-text-primary">
          Library
        </h1>
        <p className="text-ui text-text-secondary">Not built yet.</p>
        <Link href="/" className="text-ui text-link hover:text-link-hover">
          Back to your campaigns
        </Link>
      </div>
    </main>
  );
}

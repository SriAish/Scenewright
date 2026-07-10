import Link from "next/link";

/*
  Temporary placeholder. Adventure directory gets its real screen (4,
  curated free-adventure link list) in a later build step.
*/
export default function DirectoryPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-canvas px-lg">
      <div className="w-full max-w-[420px] bg-surface-card-solid border border-border-default rounded-md shadow-card p-xl flex flex-col gap-sm text-center">
        <h1 className="font-display italic font-semibold text-[22px] text-text-primary">
          Adventure directory
        </h1>
        <p className="text-ui text-text-secondary">Not built yet.</p>
        <Link href="/" className="text-ui text-link hover:text-link-hover">
          Back to your campaigns
        </Link>
      </div>
    </main>
  );
}

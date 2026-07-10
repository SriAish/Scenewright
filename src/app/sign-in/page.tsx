import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign in - Scenewright",
};

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-canvas px-lg">
      <div className="w-full max-w-[380px] bg-surface-card-solid border border-border-default rounded-md shadow-card p-xl flex flex-col gap-lg">
        <div className="text-center">
          <h1 className="font-display italic font-semibold text-[28px] text-text-primary">
            Scenewright
          </h1>
          <p className="text-ui text-text-secondary mt-[4px]">plan campaigns, scene by scene</p>
        </div>

        <SignInForm />

        <p className="text-center text-micro text-text-secondary">
          <Link href="/attribution" className="text-link hover:text-link-hover">
            SRD attribution
          </Link>
        </p>
      </div>
    </main>
  );
}

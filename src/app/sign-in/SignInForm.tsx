"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

type Mode = "sign-in" | "sign-up";

function mapAuthError(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "That email and password combination is not correct.";
    case "user_already_exists":
    case "email_exists":
    case "identity_already_exists":
      return "An account with that email already exists. Try signing in instead.";
    case "weak_password":
      return "That password is too weak. Use a longer password with a mix of characters.";
    case "email_address_invalid":
      return "Enter a valid email address.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Wait a moment and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function SignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(mapAuthError(authError));
      setLoading(false);
      return;
    }

    router.refresh();
    router.push("/");
  }

  function toggleMode() {
    setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-base">
      <Input
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Input
        label="Password"
        type="password"
        name="password"
        autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && (
        <p role="alert" className="text-ui text-danger-text bg-danger-bg-hover rounded-sm px-sm py-sm">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={loading} className="w-full disabled:opacity-60">
        {loading ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Sign up"}
      </Button>

      <button
        type="button"
        onClick={toggleMode}
        className="text-ui text-link hover:text-link-hover cursor-pointer text-center"
      >
        {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}

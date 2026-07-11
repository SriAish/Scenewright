import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LibraryShell } from "@/components/library/LibraryShell";

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/sign-in");
  }

  return <LibraryShell userEmail={user.email ?? ""} signOutAction={signOut} />;
}

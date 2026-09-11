import { createClient } from "@/lib/supabase/server";
import { NavBarClient } from "./NavBarClient";

// Server component: fetches the real Supabase session/profile, then hands
// it to the client component that owns the interactive hamburger drawer
// and mobile bottom bar. Splitting this way keeps auth reads server-side
// (no client-side session leakage) while still allowing useState for the
// menu — Server Components can't hold interactive state themselves.
export async function NavBar() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    profile = data;
  }

  return <NavBarClient user={user} profile={profile} />;
}

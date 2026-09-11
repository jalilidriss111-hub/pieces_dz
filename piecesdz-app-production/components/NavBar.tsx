import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Wrench, Search, ListChecks, Newspaper, Store } from "lucide-react";

export async function NavBar() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    profile = data;
  }

  const navItems = [
    { href: "/search", label: "Rechercher", icon: Search },
    { href: "/requests", label: "Mes demandes", icon: ListChecks },
    { href: "/news", label: "Nouveautés", icon: Newspaper },
    { href: "/shop", label: "Espace pro", icon: Store },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
            <Wrench size={18} className="text-slate-950" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">PiecesDZ</span>
        </Link>

        {/* Desktop nav — unchanged */}
        {user && (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-900"
              >
                <item.icon size={16} /> {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user && profile ? (
            <Link href="/dashboard" className="flex items-center gap-2">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.full_name ?? "Profile"} width={32} height={32} className="rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-300">
                  {(profile.full_name ?? profile.email ?? "?").charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden sm:inline text-sm font-medium text-slate-200">{profile.full_name ?? profile.email}</span>
            </Link>
          ) : (
            <Link href="/login" className="px-4 py-2 rounded-lg bg-orange-500 text-slate-950 text-sm font-semibold hover:bg-orange-400">
              Connexion
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav — new. Bottom tab bar, visible only below md. */}
      {user && (
        <nav className="md:hidden flex items-stretch border-t border-slate-800 bg-slate-950/95">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-slate-400 hover:text-white"
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

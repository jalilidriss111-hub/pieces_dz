"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Wrench, Menu, X, Settings, Home, Search, ListChecks, Newspaper, Store, Gauge,
} from "lucide-react";

type Profile = {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
} | null;

// Full menu — reachable only through the hamburger drawer, never rendered
// permanently in the header per the redesign requirement.
const MENU_ITEMS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/search", label: "Rechercher", icon: Search },
  { href: "/requests", label: "Mes demandes", icon: ListChecks },
  { href: "/news", label: "Nouveautés", icon: Newspaper },
  { href: "/shop", label: "Espace pro", icon: Store },
  { href: "/specs", label: "Spécifications techniques", icon: Gauge },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

// Mobile bottom bar — exactly 5 items per the redesign spec.
const BOTTOM_ITEMS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/search", label: "Rechercher", icon: Search },
  { href: "/requests", label: "Mes demandes", icon: ListChecks },
  { href: "/specs", label: "Spécifications", icon: Gauge },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export function NavBarClient({ user, profile }: { user: any; profile: Profile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu"
            className="w-9 h-9 rounded-lg border border-slate-700 flex items-center justify-center text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
          >
            <Menu size={18} />
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Wrench size={18} className="text-slate-950" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">PiecesDZ</span>
          </Link>

          <Link
            href="/settings"
            aria-label="Paramètres"
            className="w-9 h-9 rounded-lg border border-slate-700 flex items-center justify-center text-slate-300 hover:border-slate-500 hover:text-white transition-colors relative"
          >
            <Settings size={18} />
            {user && profile?.avatar_url && (
              <Image
                src={profile.avatar_url}
                alt=""
                width={14}
                height={14}
                className="rounded-full absolute -bottom-1 -right-1 border border-slate-950"
              />
            )}
          </Link>
        </div>
      </header>

      {/* Hamburger drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-72 max-w-[85vw] h-full bg-slate-950 border-r border-slate-800 flex flex-col"
          >
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                  <Wrench size={18} className="text-slate-950" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-lg text-white">PiecesDZ</span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Fermer le menu"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-2">
              {MENU_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors ${
                      active ? "bg-slate-900 text-white" : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {user && profile && (
              <div className="border-t border-slate-800 p-4 flex items-center gap-3">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt="" width={36} height={36} className="rounded-full" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-300">
                    {(profile.full_name ?? profile.email ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{profile.full_name ?? "—"}</p>
                  <p className="text-xs text-slate-500 truncate">{profile.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile bottom navigation — visible only below md, exactly 5 items */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 flex">
        {BOTTOM_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium ${
                active ? "text-orange-400" : "text-slate-500"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Spacer so page content isn't hidden behind the fixed bottom bar on mobile */}
      <div className="md:hidden h-14" />
    </>
  );
}

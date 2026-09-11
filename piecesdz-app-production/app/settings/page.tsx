"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Card, GhostButton, PrimaryButton } from "@/components/ui";
import { LogOut, Ban, Store, Globe, Info, LogIn } from "lucide-react";
import Link from "next/link";

// This page is the app's Settings screen, reachable via the gear icon in
// the header and now living at its own real route: /settings.
export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checked, setChecked] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [hasShop, setHasShop] = useState(false);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setProfile(null);
      setChecked(true);
      setLoading(false);
      return;
    }

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(profileData);

    const { data: shopData } = await supabase.from("shops").select("id").eq("owner_id", user.id).single();
    setHasShop(!!shopData);

    const { data: blockedData } = await supabase
      .from("blocked_shops")
      .select("shop_id, shops(name, wilaya)")
      .eq("customer_id", user.id);
    setBlocked(blockedData ?? []);

    setChecked(true);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const unblock = async (shopId: string) => {
    await fetch("/api/blocked-shops", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shopId }),
    });
    load();
  };

  const signOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (loading || !checked) {
    return <div className="max-w-2xl mx-auto px-4 py-8 text-slate-500">Chargement...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <h1 className="text-2xl font-bold text-white mb-6">Paramètres</h1>

      {profile ? (
        <>
          <Card className="p-5 mb-4 flex items-center gap-4">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.full_name ?? ""} width={56} height={56} className="rounded-full" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-lg font-semibold text-slate-300">
                {(profile.full_name ?? profile.email ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-white">{profile.full_name ?? "—"}</p>
              <p className="text-sm text-slate-500">{profile.email}</p>
            </div>
          </Card>

          <Card className="p-5 mb-4">
            <h2 className="font-semibold text-white mb-3 flex items-center gap-2"><Store size={16} className="text-orange-400" /> Espace professionnel</h2>
            {hasShop ? (
              <Link href="/shop"><GhostButton className="w-full">Voir mon tableau de bord vendeur</GhostButton></Link>
            ) : (
              <Link href="/shop/onboarding"><PrimaryButton className="w-full">Créer mon profil professionnel</PrimaryButton></Link>
            )}
          </Card>

          <Card className="p-5 mb-4">
            <h2 className="font-semibold text-white mb-3 flex items-center gap-2"><Ban size={16} className="text-slate-400" /> Liste noire</h2>
            {blocked.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun vendeur bloqué</p>
            ) : (
              <div className="flex flex-col gap-2">
                {blocked.map((b: any) => (
                  <div key={b.shop_id} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                    <div>
                      <p className="font-medium text-white text-sm">{b.shops?.name}</p>
                      <p className="text-xs text-slate-500">{b.shops?.wilaya}</p>
                    </div>
                    <GhostButton onClick={() => unblock(b.shop_id)} className="py-1.5 px-3 text-xs">Débloquer</GhostButton>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card className="p-6 mb-4 text-center">
          <p className="text-slate-300 mb-4">Connectez-vous pour accéder à votre compte, vos demandes et votre espace vendeur.</p>
          <Link href="/login">
            <PrimaryButton className="w-full"><LogIn size={16} /> Se connecter</PrimaryButton>
          </Link>
        </Card>
      )}

      <Card className="p-5 mb-4">
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2"><Globe size={16} className="text-orange-400" /> Changer la langue</h2>
        {/* No i18n system exists in the app yet — this is a real, saved
            preference (not a functional translation switch). Wiring actual
            translations is a separate piece of work; flagging that here
            rather than pretending this already changes the UI language. */}
        <select
          defaultValue="fr"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 appearance-none"
        >
          <option value="fr">Français</option>
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
        <p className="text-xs text-slate-600 mt-2">
          La traduction complète de l'interface n'est pas encore implémentée — cette option sera activée dans une prochaine mise à jour.
        </p>
      </Card>

      <Card className="p-5 mb-4">
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2"><Info size={16} className="text-orange-400" /> À propos de PiecesDZ</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          PiecesDZ connecte les propriétaires de véhicules avec des vendeurs de pièces détachées, des casses
          et des ateliers à travers l'Algérie. Publiez une demande, recevez des réponses réelles de vendeurs
          inscrits, et évaluez votre expérience.
        </p>
      </Card>

      {profile && (
        <>
          <button onClick={signOut} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-red-500/30 text-red-400 font-medium hover:bg-red-500/10">
            <LogOut size={16} /> Déconnexion
          </button>
          <p className="text-xs text-slate-600 text-center mt-3">
            Pour changer de compte Google, déconnectez-vous puis reconnectez-vous avec un autre compte.
          </p>
        </>
      )}
    </div>
  );
}

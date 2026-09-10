"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Card, GhostButton, PrimaryButton } from "@/components/ui";
import { LogOut, Ban, Store, User as UserIcon } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [hasShop, setHasShop] = useState(false);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(profileData);

    const { data: shopData } = await supabase.from("shops").select("id").eq("owner_id", user.id).single();
    setHasShop(!!shopData);

    const { data: blockedData } = await supabase
      .from("blocked_shops")
      .select("shop_id, shops(name, wilaya)")
      .eq("customer_id", user.id);
    setBlocked(blockedData ?? []);

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
  const supabase = createClient();

  await supabase.auth.signOut();

  router.replace("/login");
  router.refresh();
};

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-8 text-slate-500">Chargement...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <h1 className="text-2xl font-bold text-white mb-6">Mon profil</h1>

      <Card className="p-5 mb-4 flex items-center gap-4">
        {profile?.avatar_url ? (
          <Image src={profile.avatar_url} alt={profile.full_name ?? ""} width={56} height={56} className="rounded-full" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-lg font-semibold text-slate-300">
            {(profile?.full_name ?? profile?.email ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold text-white">{profile?.full_name ?? "—"}</p>
          <p className="text-sm text-slate-500">{profile?.email}</p>
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

      <button onClick={signOut} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-red-500/30 text-red-400 font-medium hover:bg-red-500/10">
        <LogOut size={16} /> Déconnexion
      </button>
      <p className="text-xs text-slate-600 text-center mt-3">
        Pour changer de compte Google, déconnectez-vous puis reconnectez-vous avec un autre compte.
      </p>
    </div>
  );
}

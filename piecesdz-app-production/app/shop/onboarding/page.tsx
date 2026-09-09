"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, PrimaryButton, inputCls, selectCls } from "@/components/ui";
import { WILAYAS, SHOP_CATEGORIES } from "@/lib/reference-data";
import { Store } from "lucide-react";

export default function ShopOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", wilaya: WILAYAS[15], address: "", maps_link: "", category: "new_parts" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: shop } = await supabase.from("shops").select("id").eq("owner_id", user.id).single();
      if (shop) { router.push("/shop"); return; }
      setChecking(false);
    })();
  }, []);

  const submit = async () => {
    if (!form.name || !form.phone || !form.address) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/shops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(json.error); return; }
    router.push("/shop");
  };

  if (checking) return <div className="max-w-lg mx-auto px-4 py-8 text-slate-500">Chargement...</div>;

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 pb-16">
      <h1 className="text-2xl font-bold text-white mb-1">Créer mon profil professionnel</h1>
      <p className="text-slate-500 text-sm mb-6">Renseignez les informations de votre commerce.</p>

      <Card className="p-5 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Nom du commerce</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Ets ..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Téléphone</label>
          <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="0555 00 00 00" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Wilaya</label>
            <select value={form.wilaya} onChange={(e) => setForm((f) => ({ ...f, wilaya: e.target.value }))} className={selectCls}>
              {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Catégorie</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={selectCls}>
              {SHOP_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Adresse exacte</label>
          <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className={inputCls} placeholder="Rue, quartier, ville" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Lien Google Maps</label>
          <input value={form.maps_link} onChange={(e) => setForm((f) => ({ ...f, maps_link: e.target.value }))} className={inputCls} placeholder="https://maps.google.com/..." />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <PrimaryButton onClick={submit} disabled={submitting} className="mt-2">
          <Store size={16} /> {submitting ? "Création..." : "Créer le profil"}
        </PrimaryButton>
      </Card>
    </div>
  );
}

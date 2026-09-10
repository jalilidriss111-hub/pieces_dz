"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, Badge, PrimaryButton, inputCls } from "@/components/ui";
import { CONDITIONS } from "@/lib/reference-data";
import { Store, Bell, MapPin, Clock, CheckCircle2, Send, X, Star } from "lucide-react";

export default function ShopDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [shop, setShop] = useState<any>(null);
  const [rating, setRating] = useState<{ avg_rating: number; review_count: number } | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingReq, setRespondingReq] = useState<any>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: shopData } = await supabase.from("shops").select("*").eq("owner_id", user.id).single();
    if (!shopData) { router.push("/shop/onboarding"); return; }
    setShop(shopData);

    const { data: ratingData } = await supabase
  .from("shop_ratings")
  .select("*")
  .eq("shop_id", (shopData as any).id)
  .single();
    setRating(ratingData ?? { avg_rating: 0, review_count: 0 });

    // Requests matching this shop's wilaya, or all-Algeria requests. RLS
    // already restricts to what this shop owner is allowed to see.
    const { data: reqData } = await supabase
      .from("part_requests")
      .select("*, shop_responses(*)")
      .or(`wilaya.eq.${shopData.wilaya},all_algeria.eq.true`)
      .neq("status", "closed")
      .order("created_at", { ascending: false });
    setRequests(reqData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!shop) return;
    const channel = supabase
      .channel("shop-dashboard")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "part_requests" }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "part_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shop, load]);

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8 text-slate-500">Chargement...</div>;
  if (!shop) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/15 flex items-center justify-center"><Store size={24} className="text-orange-400" /></div>
        <div>
          <h1 className="text-xl font-bold text-white">{shop.name}</h1>
          <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={12} /> {shop.wilaya}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-6 mt-2">
        <Star size={14} className="text-amber-400 fill-amber-400" />
        <span className="text-sm text-slate-300 font-medium">{rating?.avg_rating ?? 0}</span>
        <span className="text-sm text-slate-500">({rating?.review_count ?? 0} avis)</span>
      </div>

      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Bell size={17} className="text-orange-400" /> Demandes reçues</h2>

      {requests.length === 0 ? (
        <Card className="p-8 text-center text-slate-500 text-sm">Aucune demande pour le moment</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => {
            const myResp = r.shop_responses?.find((resp: any) => resp.shop_id === shop.id);
            return (
              <Card key={r.id} className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-white">{r.part_name}</h3>
                    <p className="text-sm text-slate-500">{r.brand} {r.model} — {r.year}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin size={11} /> {r.all_algeria ? "Toutes les wilayas" : r.wilaya}</p>
                  </div>
                  {myResp ? <Badge tone="found"><CheckCircle2 size={12} /> Disponible</Badge> : <Badge tone="pending"><Clock size={12} /> En attente</Badge>}
                </div>
                {myResp ? (
                  <div className="flex gap-4 text-sm pt-3 border-t border-slate-800">
                    <span className="text-orange-400 font-semibold">{myResp.price ? `${Number(myResp.price).toLocaleString()} DA` : "Sur demande"}</span>
                    <span className="text-slate-400">{CONDITIONS.find((c) => c.value === myResp.condition)?.label}</span>
                  </div>
                ) : (
                  <PrimaryButton onClick={() => setRespondingReq(r)} className="w-full py-2.5 text-sm">Marquer disponible</PrimaryButton>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {respondingReq && (
        <RespondModal request={respondingReq} onClose={() => setRespondingReq(null)} onSubmitted={load} />
      )}
    </div>
  );
}

function RespondModal({ request, onClose, onSubmitted }: { request: any; onClose: () => void; onSubmitted: () => void }) {
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("new");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: request.id, price: price ? Number(price) : null, condition, note }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(json.error); return; }
    onSubmitted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Marquer disponible</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20} /></button>
        </div>
        <p className="text-sm text-slate-400 mb-4">{request.part_name} — {request.brand} {request.model} ({request.year})</p>

        <label className="block text-sm font-medium text-slate-400 mb-1.5">Prix (DA)</label>
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} placeholder="12000" />

        <div className="mt-4">
          <span className="block text-sm font-medium text-slate-400 mb-1.5">État</span>
          <div className="grid grid-cols-2 gap-2">
            {CONDITIONS.map((c) => (
              <button key={c.value} onClick={() => setCondition(c.value)}
                className={`justify-center py-2.5 rounded-full text-sm font-medium border ${condition === c.value ? "bg-orange-500 text-slate-950 border-orange-500" : "border-slate-700 text-slate-300"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Note (optionnel)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputCls + " resize-none"} />
        </div>

        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        <PrimaryButton onClick={submit} disabled={submitting} className="w-full mt-5">
          <Send size={15} /> {submitting ? "Envoi..." : "Envoyer la réponse"}
        </PrimaryButton>
      </div>
    </div>
  );
}

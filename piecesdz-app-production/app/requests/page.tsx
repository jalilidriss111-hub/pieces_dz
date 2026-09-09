"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Badge, PrimaryButton, GhostButton, inputCls } from "@/components/ui";
import { CONDITIONS } from "@/lib/reference-data";
import { ListChecks, Search, Clock, CheckCircle2, XCircle, MapPin, X, Star, Phone, ExternalLink, BadgeCheck } from "lucide-react";
import Link from "next/link";

const STATUS_TONE: Record<string, "pending" | "found" | "closed"> = { pending: "pending", found: "found", closed: "closed" };
const STATUS_ICON: Record<string, any> = { pending: Clock, found: CheckCircle2, closed: XCircle };
const STATUS_LABEL: Record<string, string> = { pending: "En attente", found: "Trouvée", closed: "Clôturée" };

export default function RequestsPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openReq, setOpenReq] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);
    const { data } = await supabase
      .from("part_requests")
      .select("*, shop_responses(*, shops(*))")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });
    setRequests(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("my-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "part_requests" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_responses" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const closeRequest = async (id: string) => {
    await fetch(`/api/requests/${id}/close`, { method: "POST" });
    load();
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8 text-slate-500">Chargement...</div>;

  if (!userId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <p className="text-slate-300 mb-4">Connectez-vous pour voir vos demandes.</p>
          <Link href="/login"><PrimaryButton>Connexion</PrimaryButton></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <h1 className="text-2xl font-bold text-white mb-1">Mes demandes</h1>
      <p className="text-slate-500 text-sm mb-6">Historique de vos recherches de pièces.</p>

      {requests.length === 0 ? (
        <Card className="p-10 text-center">
          <ListChecks className="mx-auto text-slate-600 mb-3" size={32} />
          <p className="text-slate-300 font-medium">Aucune demande pour l'instant</p>
          <p className="text-sm text-slate-500 mt-1 mb-5">Lancez une recherche de pièce pour voir apparaître vos demandes ici.</p>
          <Link href="/search"><PrimaryButton><Search size={15} /> Chercher une pièce</PrimaryButton></Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => {
            const Icon = STATUS_ICON[r.status];
            return (
              <Card key={r.id} className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge tone={STATUS_TONE[r.status]}><Icon size={12} /> {STATUS_LABEL[r.status]}</Badge>
                      <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-semibold text-white">{r.part_name}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{r.brand} {r.model} — {r.year}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin size={11} /> {r.all_algeria ? "Toutes les wilayas" : r.wilaya}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-orange-400">{r.shop_responses?.length ?? 0}</p>
                    <p className="text-[11px] text-slate-500">réponse(s)</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <GhostButton onClick={() => setOpenReq(r)} className="flex-1 py-2.5 text-sm">Voir les détails</GhostButton>
                  {r.status !== "closed" && (
                    <GhostButton onClick={() => closeRequest(r.id)} className="py-2.5 text-sm px-4">
                      <XCircle size={14} /> Clôturer
                    </GhostButton>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {openReq && <RequestDetailModal request={openReq} onClose={() => setOpenReq(null)} onChanged={load} />}
    </div>
  );
}

function RequestDetailModal({ request, onClose, onChanged }: { request: any; onClose: () => void; onChanged: () => void }) {
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const responses = request.shop_responses ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">{request.part_name}</h2>
            <p className="text-sm text-slate-500">{request.brand} {request.model} — {request.year}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20} /></button>
        </div>

        {responses.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">En attente de réponses...</p>
        ) : (
          <div className="flex flex-col gap-3">
            {responses.map((r: any) => (
              <div key={r.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white text-sm flex items-center gap-1.5">
                    {r.shops.name} {r.shops.verified && <BadgeCheck size={13} className="text-blue-400" />}
                  </span>
                  <Badge tone="found"><CheckCircle2 size={11} /> Disponible</Badge>
                </div>
                <div className="flex gap-4 text-sm mb-3">
                  <span className="text-orange-400 font-semibold">{r.price ? `${Number(r.price).toLocaleString()} DA` : "Sur demande"}</span>
                  <span className="text-slate-400">{CONDITIONS.find((c) => c.value === r.condition)?.label}</span>
                </div>
                {r.note && <p className="text-sm text-slate-400 mb-3">{r.note}</p>}
                <button onClick={() => setSelectedShop(r.shops)} className="text-xs text-orange-400 font-medium">Voir les détails et noter →</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedShop && (
        <ShopDetailAndReviewModal shop={selectedShop} requestId={request.id} onClose={() => setSelectedShop(null)} onChanged={onChanged} />
      )}
    </div>
  );
}

function ShopDetailAndReviewModal({ shop, requestId, onClose, onChanged }: { shop: any; requestId: string; onClose: () => void; onChanged: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submitReview = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_id: shop.id, rating, comment, request_id: requestId }),
    });
    setSubmitting(false);
    setSubmitted(true);
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{shop.name}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-slate-500 mt-0.5 shrink-0" />
            <span className="text-sm text-slate-300">{shop.address}, {shop.wilaya}</span>
          </div>
          <div className="flex items-start gap-3">
            <Phone size={16} className="text-slate-500 mt-0.5 shrink-0" />
            <span className="text-sm text-slate-300">{shop.phone}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <a href={`tel:${shop.phone.replace(/\s/g, "")}`}>
            <PrimaryButton className="w-full"><Phone size={15} /> Appeler</PrimaryButton>
          </a>
          {shop.maps_link && (
            <a href={shop.maps_link} target="_blank" rel="noreferrer">
              <GhostButton className="w-full"><ExternalLink size={15} /> Itinéraire</GhostButton>
            </a>
          )}
        </div>

        <div className="border-t border-slate-800 pt-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Noter ce vendeur</h3>
          {submitted ? (
            <p className="text-sm text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={15} /> Merci pour votre avis !</p>
          ) : (
            <>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)}>
                    <Star size={26} className={n <= rating ? "text-amber-400 fill-amber-400" : "text-slate-700"} />
                  </button>
                ))}
              </div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Votre avis (optionnel)" rows={2} className={inputCls + " resize-none mb-3"} />
              <PrimaryButton onClick={submitReview} disabled={rating === 0 || submitting} className="w-full">
                {submitting ? "Envoi..." : "Envoyer l'avis"}
              </PrimaryButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

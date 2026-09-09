"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { BRANDS, MODELS, YEARS, CATEGORY_TREE, WILAYAS, CONDITIONS } from "@/lib/reference-data";
import { Card, PrimaryButton, GhostButton, Badge, inputCls, selectCls } from "@/components/ui";
import { VEHICLE_FALLBACK_STRINGS, type Lang } from "@/lib/vehicle-fallback-i18n";
import {
  ArrowRight, ArrowLeft, CheckCircle2, Clock, Send, MapPin, Package, Car,
  Store, BadgeCheck, Star, Phone, ExternalLink, X, AlertCircle,
} from "lucide-react";

const STEP_LABELS = ["Marque", "Modèle", "Année", "Catégorie", "Pièce", "Localisation"];

type Category = typeof CATEGORY_TREE[number];

export default function SearchPage({ lang = "fr" }: { lang?: Lang }) {
  const t = VEHICLE_FALLBACK_STRINGS[lang];
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [brand, setBrand] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [part, setPart] = useState<string | null>(null);
  const [customPart, setCustomPart] = useState("");
  const [wilaya, setWilaya] = useState(WILAYAS[15]); // Alger
  const [allAlgeria, setAllAlgeria] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [matchingShops, setMatchingShops] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual vehicle fallback — used when the brand isn't in BRANDS at all
  // ("Véhicule non trouvé" / "Car not found" / "لم أجد سيارتي").
  const [manualVehicle, setManualVehicle] = useState(false);
  const [manualBrand, setManualBrand] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [manualYear, setManualYear] = useState("");

  const effectiveBrand = manualVehicle ? manualBrand.trim() : brand;
  const effectiveModel = manualVehicle ? manualModel.trim() : model;
  const effectiveYear = manualVehicle ? (manualYear ? Number(manualYear) : null) : year;

  const finalPart = customPart.trim() || part;
  const goNext = () => setStep((s) => Math.min(s + 1, STEP_LABELS.length));
  const goBack = () => {
    if (manualVehicle && step === 3) { setStep(0); return; }
    setStep((s) => Math.max(s - 1, 0));
  };

  // Manual entry collects brand+model+year together in step 0, so skip the
  // separate model (1) and year (2) steps straight to category (3).
  useEffect(() => {
    if (manualVehicle && (step === 1 || step === 2)) setStep(3);
  }, [manualVehicle, step]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: effectiveBrand, model: effectiveModel, year: effectiveYear, category: category?.id, part_name: finalPart, wilaya, all_algeria: allAlgeria }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit request");
      setActiveRequestId(json.request.id);
      setMatchingShops(json.matchingShops);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (activeRequestId) {
    return (
      <SearchResults
        requestId={activeRequestId}
        matchingShops={matchingShops ?? 0}
        onNewSearch={() => {
          setActiveRequestId(null);
          setStep(0);
          setBrand(null); setModel(null); setYear(null); setCategory(null); setPart(null); setCustomPart("");
        }}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <h1 className="text-2xl font-bold text-white mb-1">Votre véhicule</h1>
      <p className="text-slate-500 mb-6 text-sm">Décrivez votre véhicule, on alerte les vendeurs près de vous.</p>

      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
              i < step ? "bg-orange-500 border-orange-500 text-slate-950" :
              i === step ? "border-orange-500 text-orange-400" : "border-slate-700 text-slate-600"
            }`}>
              {i < step ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span className={`text-xs sm:text-sm font-medium ${i === step ? "text-white" : "text-slate-500"}`}>{label}</span>
          </div>
        ))}
      </div>

      {step === 0 && !manualVehicle && (
        <Card className="p-5">
          <h2 className="font-semibold text-white mb-4">Choisissez la marque</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {BRANDS.map((b) => (
              <button key={b} onClick={() => { setBrand(b); setModel(null); goNext(); }}
                className={`px-4 py-3 rounded-full text-sm font-medium border ${brand === b ? "bg-orange-500 text-slate-950 border-orange-500" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
                {b}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setManualVehicle(true); setBrand(null); setModel(null); setYear(null); }}
            className="w-full mt-3 text-sm text-orange-400 hover:text-orange-300 font-medium py-2.5 border border-dashed border-slate-700 rounded-xl"
          >
            {t.carNotFound}
          </button>
        </Card>
      )}

      {step === 0 && manualVehicle && (
        <Card className="p-5" dir={lang === "ar" ? "rtl" : "ltr"}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">{t.manualEntryTitle}</h2>
            <button onClick={() => { setManualVehicle(false); setManualBrand(""); setManualModel(""); setManualYear(""); }} className="text-xs text-slate-500 hover:text-slate-300">
              {t.backToList}
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">{t.brand}</label>
              <input value={manualBrand} onChange={(e) => setManualBrand(e.target.value)} placeholder={t.brandPlaceholder} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">{t.model}</label>
              <input value={manualModel} onChange={(e) => setManualModel(e.target.value)} placeholder={t.modelPlaceholder} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">{t.year}</label>
              <input
                type="number"
                value={manualYear}
                onChange={(e) => setManualYear(e.target.value)}
                placeholder={t.yearPlaceholder}
                min={1970}
                max={2060}
                className={inputCls}
              />
            </div>
          </div>
          <PrimaryButton
            onClick={goNext}
            disabled={!manualBrand.trim() || !manualModel.trim() || !manualYear}
            className="w-full mt-4"
          >
            {t.next} <ArrowRight size={16} />
          </PrimaryButton>
        </Card>
      )}

      {step === 1 && !manualVehicle && brand && (
        <Card className="p-5">
          <h2 className="font-semibold text-white mb-4">Choisissez le modèle — {brand}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {(MODELS[brand] || []).map((m) => (
              <button key={m} onClick={() => { setModel(m); goNext(); }}
                className={`px-4 py-3 rounded-full text-sm font-medium border ${model === m ? "bg-orange-500 text-slate-950 border-orange-500" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
                {m}
              </button>
            ))}
          </div>
        </Card>
      )}



      {step === 2 && !manualVehicle && (
        <Card className="p-5">
          <h2 className="font-semibold text-white mb-4">Année de fabrication</h2>
          <select value={year ?? ""} onChange={(e) => setYear(Number(e.target.value))} className={selectCls}>
            <option value="" disabled>Choisir l'année</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <PrimaryButton onClick={goNext} disabled={!year} className="w-full mt-4">Suivant <ArrowRight size={16} /></PrimaryButton>
        </Card>
      )}



      {step === 3 && (
        <Card className="p-5">
          <h2 className="font-semibold text-white mb-4">Catégorie de la pièce</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {CATEGORY_TREE.map((cat) => (
              <button key={cat.id} onClick={() => { setCategory(cat); setPart(null); goNext(); }}
                className={`flex items-center gap-3 p-4 rounded-xl border text-left ${category?.id === cat.id ? "border-orange-500 bg-orange-500/10" : "border-slate-700 hover:border-slate-500"}`}>
                <span className="text-sm font-medium text-slate-200">{cat.label}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === 4 && category && (
        <Card className="p-5">
          <h2 className="font-semibold text-white mb-4">Sélectionnez la pièce — {category.label}</h2>
          <div className="max-h-72 overflow-y-auto flex flex-col gap-1.5 mb-4 pr-1">
            {category.parts.map((p) => (
              <button key={p} onClick={() => { setPart(p); setCustomPart(""); }}
                className={`text-left px-4 py-2.5 rounded-lg text-sm ${part === p ? "bg-orange-500/15 text-orange-300 border border-orange-500/40" : "text-slate-300 hover:bg-slate-800 border border-transparent"}`}>
                {p}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-800 pt-4">
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Vous ne trouvez pas la pièce ?</label>
            <input value={customPart} onChange={(e) => { setCustomPart(e.target.value); if (e.target.value) setPart(null); }}
              placeholder="Décrivez la pièce recherchée..." className={inputCls} />
          </div>
          <PrimaryButton onClick={goNext} disabled={!finalPart} className="w-full mt-4">Suivant <ArrowRight size={16} /></PrimaryButton>
        </Card>
      )}

      {step === 5 && (
        <Card className="p-5">
          <h2 className="font-semibold text-white mb-4">Localisation</h2>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Votre wilaya</label>
          <select value={wilaya} onChange={(e) => setWilaya(e.target.value)} disabled={allAlgeria} className={selectCls + (allAlgeria ? " opacity-40" : "")}>
            {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          <label className="flex items-center gap-3 mt-4 cursor-pointer">
            <input type="checkbox" checked={allAlgeria} onChange={(e) => setAllAlgeria(e.target.checked)} className="w-4 h-4 accent-orange-500" />
            <span className="text-sm text-slate-300">Toutes les wilayas</span>
          </label>

          <div className="mt-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Résumé de la demande</h3>
            <div className="text-sm text-slate-400 space-y-1">
              <p><Car size={13} className="inline mr-1.5" />{effectiveBrand} {effectiveModel} — {effectiveYear}</p>
              <p><Package size={13} className="inline mr-1.5" />{finalPart}</p>
              <p><MapPin size={13} className="inline mr-1.5" />{allAlgeria ? "Toutes les wilayas" : wilaya}</p>
            </div>
          </div>

          {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

          <PrimaryButton onClick={submit} disabled={submitting} className="w-full mt-5">
            <Send size={16} /> {submitting ? "Envoi..." : "Envoyer et notifier les vendeurs"}
          </PrimaryButton>
        </Card>
      )}

      {step > 0 && (
        <button onClick={goBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mt-5">
          <ArrowLeft size={14} /> Retour
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */

function SearchResults({ requestId, matchingShops, onNewSearch }: { requestId: string; matchingShops: number; onNewSearch: () => void }) {
  const supabase = createClient();
  const [request, setRequest] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<any>(null);

  const loadResponses = useCallback(async () => {
    const { data } = await supabase
      .from("shop_responses")
      .select("*, shops(*)")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
    setResponses(data ?? []);
  }, [requestId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("part_requests").select("*").eq("id", requestId).single();
      setRequest(data);
    })();
    loadResponses();

    // Real-time: listen for new responses landing on this exact request.
    const channel = supabase
      .channel(`request-${requestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "shop_responses", filter: `request_id=eq.${requestId}` },
        () => loadResponses()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "part_requests", filter: `id=eq.${requestId}` },
        (payload) => setRequest(payload.new)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [requestId, loadResponses]);

  if (!request) return <div className="max-w-3xl mx-auto px-4 py-8 text-slate-500">Chargement...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <button onClick={onNewSearch} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-5">
        <ArrowLeft size={14} /> Retour
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge tone="orange"><Package size={12} /> {request.part_name}</Badge>
          <Badge>{request.brand} {request.model} {request.year}</Badge>
        </div>
        <h1 className="text-xl font-bold text-white">{matchingShops} vendeur(s) correspondant(s)</h1>
        <p className="text-sm text-slate-500 mt-1">
          Demande envoyée. Les réponses des vendeurs apparaîtront ici en temps réel.
        </p>
      </div>

      {matchingShops === 0 ? (
        <Card className="p-8 text-center">
          <AlertCircle className="mx-auto text-slate-600 mb-3" size={32} />
          <p className="text-slate-300 font-medium">Aucun vendeur trouvé pour ces critères</p>
          <p className="text-sm text-slate-500 mt-1">Essayez d'élargir à toutes les wilayas</p>
        </Card>
      ) : responses.length === 0 ? (
        <Card className="p-8 text-center">
          <Clock className="mx-auto text-slate-600 mb-3" size={28} />
          <p className="text-slate-300 font-medium">En attente de réponses des vendeurs</p>
          <p className="text-sm text-slate-500 mt-1">Vous serez notifié dès qu'un vendeur confirme la disponibilité.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {responses.map((r) => (
            <Card key={r.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                    <Store size={18} className="text-orange-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-white">{r.shops.name}</h3>
                      {r.shops.verified && <BadgeCheck size={14} className="text-blue-400" />}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {r.shops.wilaya}</p>
                  </div>
                </div>
                <Badge tone="found"><CheckCircle2 size={12} /> Disponible</Badge>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Prix</p>
                  <p className="font-semibold text-orange-400">{r.price ? `${Number(r.price).toLocaleString()} DA` : "Sur demande"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">État</p>
                  <p className="font-medium text-slate-200">{CONDITIONS.find((c) => c.value === r.condition)?.label}</p>
                </div>
              </div>
              <GhostButton onClick={() => setSelectedShop(r.shops)} className="w-full mt-4 py-2.5 text-sm">Voir les détails</GhostButton>
            </Card>
          ))}
        </div>
      )}

      {selectedShop && <ShopDetailModal shop={selectedShop} onClose={() => setSelectedShop(null)} />}
    </div>
  );
}

function ShopDetailModal({ shop, onClose }: { shop: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-1.5">{shop.name} {shop.verified && <BadgeCheck size={16} className="text-blue-400" />}</h2>
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
        <div className="grid grid-cols-2 gap-3">
          <a href={`tel:${shop.phone.replace(/\s/g, "")}`}>
            <PrimaryButton className="w-full"><Phone size={15} /> Appeler</PrimaryButton>
          </a>
          {shop.maps_link && (
            <a href={shop.maps_link} target="_blank" rel="noreferrer">
              <GhostButton className="w-full"><ExternalLink size={15} /> Itinéraire</GhostButton>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

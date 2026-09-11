"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, selectCls } from "@/components/ui";
import { Gauge, Car, Wrench, Hash, Settings2, Ruler, Droplet, AlertCircle } from "lucide-react";

type Brand = { id: string; name: string; origin_region: string | null };
type Model = { id: string; name: string; body_type: string | null };
type Generation = { id: string; name: string; year_start: number; year_end: number | null; doors: number | null; seats: number | null };
type EngineOption = { id: string; engine_name: string; engine_code: string | null; fuel_type: string | null; power_hp: number | null };

// "Not available" placeholder — shown for any field that is genuinely
// null in the database, never guessed or filled in.
const NA = "Information non disponible";

function Field({ label, value, unit = "" }: { label: string; value: string | number | null; unit?: string }) {
  return (
    <div>
      <p className="text-slate-500 text-xs">{label}</p>
      <p className="text-white font-medium text-sm">{value !== null && value !== undefined ? `${value}${unit}` : <span className="text-slate-600">{NA}</span>}</p>
    </div>
  );
}

export default function SpecsPage() {
  const supabase = createClient();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [engines, setEngines] = useState<EngineOption[]>([]);

  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [generationId, setGenerationId] = useState("");
  const [engineId, setEngineId] = useState("");

  const [spec, setSpec] = useState<any | null>(null);
  const [partRefs, setPartRefs] = useState<any[]>([]);
  const [loadingSpec, setLoadingSpec] = useState(false);

  useEffect(() => {
    fetch("/api/vehicle-specs?level=brands").then((r) => r.json()).then((d) => setBrands(d.brands ?? []));
  }, []);

  useEffect(() => {
    setModelId(""); setGenerationId(""); setEngineId(""); setModels([]); setGenerations([]); setEngines([]); setSpec(null);
    if (!brandId) return;
    fetch(`/api/vehicle-specs?level=models&brand_id=${brandId}`).then((r) => r.json()).then((d) => setModels(d.models ?? []));
  }, [brandId]);

  useEffect(() => {
    setGenerationId(""); setEngineId(""); setGenerations([]); setEngines([]); setSpec(null);
    if (!modelId) return;
    fetch(`/api/vehicle-specs?level=generations&model_id=${modelId}`).then((r) => r.json()).then((d) => setGenerations(d.generations ?? []));
  }, [modelId]);

  useEffect(() => {
    setEngineId(""); setEngines([]); setSpec(null);
    if (!generationId) return;
    fetch(`/api/vehicle-specs?level=engines&generation_id=${generationId}`).then((r) => r.json()).then((d) => setEngines(d.engines ?? []));
  }, [generationId]);

  useEffect(() => {
    setSpec(null); setPartRefs([]);
    if (!engineId) return;
    setLoadingSpec(true);
    fetch(`/api/vehicle-specs/detail?engine_id=${engineId}`)
      .then((r) => r.json())
      .then((d) => { setSpec(d.spec ?? null); setPartRefs(d.partReferences ?? []); })
      .finally(() => setLoadingSpec(false));
  }, [engineId]);

  const selectedGeneration = generations.find((g) => g.id === generationId);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-orange-500/15 flex items-center justify-center">
          <Gauge size={20} className="text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Spécifications techniques</h1>
          <p className="text-slate-500 text-sm">
            Trouvez votre véhicule exact et apprenez tout ce qu'il faut savoir avant de commander une pièce.
          </p>
        </div>
      </div>

      <Card className="p-5 mt-6">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Car size={16} className="text-orange-400" /> Rechercher votre véhicule
        </h2>

        {brands.length === 0 ? (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <AlertCircle size={16} className="text-slate-500 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-400">
              Aucune marque n'est encore enregistrée dans la base de données technique. Cette section
              s'alimente au fur et à mesure que des données de véhicules vérifiées sont ajoutées.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Marque</label>
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={selectCls}>
                <option value="">Choisir...</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Modèle</label>
              <select value={modelId} onChange={(e) => setModelId(e.target.value)} disabled={!brandId} className={selectCls + (!brandId ? " opacity-40" : "")}>
                <option value="">Choisir...</option>
                {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            {modelId && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Génération / Année</label>
                <select value={generationId} onChange={(e) => setGenerationId(e.target.value)} className={selectCls}>
                  <option value="">Choisir...</option>
                  {generations.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.year_start}–{g.year_end ?? "présent"})
                    </option>
                  ))}
                </select>
                {modelId && generations.length === 0 && (
                  <p className="text-xs text-slate-600 mt-1.5">Aucune génération enregistrée pour ce modèle.</p>
                )}
              </div>
            )}

            {generationId && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Moteur / Version</label>
                <select value={engineId} onChange={(e) => setEngineId(e.target.value)} className={selectCls}>
                  <option value="">Choisir...</option>
                  {engines.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.engine_name}{e.power_hp ? ` — ${e.power_hp} ch` : ""}
                    </option>
                  ))}
                </select>
                {generationId && engines.length === 0 && (
                  <p className="text-xs text-slate-600 mt-1.5">Aucun moteur enregistré pour cette génération.</p>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {loadingSpec && <div className="text-center text-slate-500 text-sm mt-6">Chargement de la fiche technique...</div>}

      {spec && !loadingSpec && (
        <div className="mt-6 flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Car size={16} className="text-orange-400" /> Informations générales
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Marque" value={spec.brand_name} />
              <Field label="Modèle" value={spec.model_name} />
              <Field label="Génération" value={spec.generation_name} />
              <Field label="Années de production" value={`${spec.year_start}–${spec.year_end ?? "présent"}`} />
              <Field label="Carrosserie" value={spec.body_type} />
              <Field label="Portes" value={spec.doors} />
              <Field label="Places" value={spec.seats} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Wrench size={16} className="text-orange-400" /> Moteur
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Nom du moteur" value={spec.engine_name} />
              <Field label="Code moteur" value={spec.engine_code} />
              <Field label="Famille moteur" value={spec.engine_family} />
              <Field label="Carburant" value={spec.fuel_type} />
              <Field label="Cylindrée" value={spec.displacement_cc} unit=" cm³" />
              <Field label="Cylindres" value={spec.cylinders} />
              <Field label="Soupapes" value={spec.valves} />
              <Field label="Admission" value={spec.induction} />
              <Field label="Puissance" value={spec.power_hp} unit=" ch" />
              <Field label="Couple" value={spec.torque_nm} unit=" Nm" />
              <Field label="Injection" value={spec.injection_type} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Settings2 size={16} className="text-orange-400" /> Transmission
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Type de boîte" value={spec.transmission_type} />
              <Field label="Nombre de rapports" value={spec.gear_count} />
              <Field label="Transmission" value={spec.drivetrain} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Ruler size={16} className="text-orange-400" /> Dimensions & capacités
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Longueur" value={spec.length_mm} unit=" mm" />
              <Field label="Largeur" value={spec.width_mm} unit=" mm" />
              <Field label="Hauteur" value={spec.height_mm} unit=" mm" />
              <Field label="Empattement" value={spec.wheelbase_mm} unit=" mm" />
              <Field label="Poids" value={spec.weight_kg} unit=" kg" />
              <Field label="Réservoir" value={spec.fuel_tank_l} unit=" L" />
              <Field label="Coffre" value={spec.boot_capacity_l} unit=" L" />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Droplet size={16} className="text-orange-400" /> Fluides & entretien
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Huile moteur" value={spec.oil_spec} />
              <Field label="Capacité huile" value={spec.oil_capacity_l} unit=" L" />
              <Field label="Liquide de refroidissement" value={spec.coolant_spec} />
              <Field label="Liquide de frein" value={spec.brake_fluid_spec} />
              <Field label="Liquide de boîte" value={spec.transmission_fluid_spec} />
              <Field label="Intervalle d'entretien" value={spec.service_interval_km} unit=" km" />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Hash size={16} className="text-orange-400" /> Références de pièces courantes
            </h3>
            {partRefs.length === 0 ? (
              <p className="text-sm text-slate-500">Information non disponible pour cette version.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {Object.entries(
                  partRefs.reduce((acc: Record<string, any[]>, r: any) => {
                    const cat = r.part_categories?.name ?? "Autre";
                    acc[cat] = acc[cat] ?? [];
                    acc[cat].push(r);
                    return acc;
                  }, {})
                ).map(([category, refs]) => (
                  <div key={category}>
                    <p className="text-sm font-medium text-slate-300 mb-1.5">{category}</p>
                    <div className="flex flex-col divide-y divide-slate-800">
                      {(refs as any[]).map((r) => (
                        <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                          <span className="text-slate-400">{r.reference_type === "oem" ? "OEM" : (r.brand_name ?? r.reference_type)}</span>
                          <span className="text-orange-400 font-mono">{r.reference_number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

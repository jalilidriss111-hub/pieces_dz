import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Search, Store, MapPin, ShieldCheck } from "lucide-react";
import { CATEGORY_TREE } from "@/lib/reference-data";

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Real counts from the database. If the tables are empty (fresh install),
  // these are honestly zero — no fallback/mock numbers.
  const { count: shopCount } = await supabase.from("shops").select("*", { count: "exact", head: true });
  const { count: requestCount } = await supabase.from("part_requests").select("*", { count: "exact", head: true });
  const { data: newsPreview } = await supabase
    .from("news_posts")
    .select("id, title, body, tag, created_at, shops(name, wilaya)")
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <div className="pb-12">
      <section className="relative border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-orange-500/10 text-orange-400 border-orange-500/30">
                <MapPin size={12} /> 58 wilayas
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-800 text-slate-300 border-slate-700">
                <ShieldCheck size={12} /> {shopCount ?? 0} vendeurs inscrits
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight mb-4">
              La pièce qu'il vous faut,<br />chez le bon vendeur, aujourd'hui.
            </h1>
            <p className="text-slate-400 text-base sm:text-lg mb-8 max-w-lg">
              Décrivez votre véhicule, on alerte les vendeurs de pièces, casses et ateliers près de vous.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={user ? "/search" : "/login"} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-orange-500 text-slate-950 font-semibold hover:bg-orange-400">
                <Search size={18} /> Chercher une pièce
              </Link>
              <Link href={user ? "/shop/onboarding" : "/login"} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-700 text-slate-200 font-medium hover:border-slate-500">
                <Store size={18} /> Je suis vendeur
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <section className="grid grid-cols-3 gap-3 sm:gap-4 py-8 border-b border-slate-800">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-orange-400">{shopCount ?? 0}</div>
            <div className="text-xs sm:text-sm text-slate-500 mt-1">vendeurs inscrits</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-orange-400">58</div>
            <div className="text-xs sm:text-sm text-slate-500 mt-1">wilayas couvertes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-orange-400">{requestCount ?? 0}</div>
            <div className="text-xs sm:text-sm text-slate-500 mt-1">demandes traitées</div>
          </div>
        </section>

        <section className="py-10">
          <h2 className="text-xl font-semibold text-white mb-5">Catégories rapides</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORY_TREE.map((cat) => (
              <Link
                key={cat.id}
                href={user ? "/search" : "/login"}
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-900 transition-all text-center"
              >
                <span className="text-sm font-medium text-slate-300 group-hover:text-white">{cat.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="py-10 border-t border-slate-800">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-white">Dernières nouveautés</h2>
            <Link href="/news" className="text-sm text-orange-400 font-medium">Voir tout</Link>
          </div>
          {!newsPreview || newsPreview.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm bg-slate-900/60 border border-slate-800 rounded-2xl">
              Aucune actualité pour le moment. Les vendeurs inscrits peuvent publier ici.
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              {newsPreview.map((n: any) => (
                <div key={n.id} className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
                  <h3 className="font-semibold text-white mb-1.5">{n.title}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2">{n.body}</p>
                  <p className="text-xs text-slate-500 mt-3">{n.shops?.name} · {n.shops?.wilaya}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

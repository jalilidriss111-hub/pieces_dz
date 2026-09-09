"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Badge, PrimaryButton, GhostButton, inputCls } from "@/components/ui";
import { PlusCircle, Send, Tag, TrendingUp, Sparkles, Store, MapPin } from "lucide-react";

const TAG_TONE: Record<string, "orange" | "found" | "pending"> = { arrival: "orange", promo: "found", clearance: "pending" };

export default function NewsPage() {
  const supabase = createClient();
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasShop, setHasShop] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("arrival");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("news_posts")
      .select("*, shops(name, wilaya)")
      .order("created_at", { ascending: false });
    setNews(data ?? []);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: shop } = await supabase.from("shops").select("id").eq("owner_id", user.id).single();
      setHasShop(!!shop);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("news-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "news_posts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const submit = async () => {
    if (!title.trim()) return;
    setPosting(true);
    setError(null);
    const res = await fetch("/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, tag }),
    });
    const json = await res.json();
    setPosting(false);
    if (!res.ok) { setError(json.error); return; }
    setTitle(""); setBody(""); setShowForm(false);
    load();
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8 text-slate-500">Chargement...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Nouveautés</h1>
          <p className="text-slate-500 text-sm">Arrivages, promotions et actus des vendeurs</p>
        </div>
        {hasShop && (
          <PrimaryButton onClick={() => setShowForm((s) => !s)} className="shrink-0 px-4 py-2.5 text-sm">
            <PlusCircle size={15} /> Publier
          </PrimaryButton>
        )}
      </div>

      {showForm && (
        <Card className="p-5 mb-6">
          <div className="flex gap-2 mb-3">
            {["arrival", "promo", "clearance"].map((tg) => (
              <button key={tg} onClick={() => setTag(tg)}
                className={`px-4 py-2 rounded-full text-sm font-medium border ${tag === tg ? "bg-orange-500 text-slate-950 border-orange-500" : "border-slate-700 text-slate-300"}`}>
                {tg}
              </button>
            ))}
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'annonce" className={inputCls + " mb-3"} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Détails de l'arrivage, de la promo..." rows={3} className={inputCls + " resize-none"} />
          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
          <PrimaryButton onClick={submit} disabled={posting} className="mt-3"><Send size={15} /> {posting ? "Publication..." : "Publier"}</PrimaryButton>
        </Card>
      )}

      {news.length === 0 ? (
        <Card className="p-10 text-center text-slate-500 text-sm">
          Aucune actualité pour le moment. Les vendeurs inscrits peuvent publier ici.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {news.map((n) => (
            <Card key={n.id} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <Badge tone={TAG_TONE[n.tag]}>
                  {n.tag === "promo" ? <Tag size={12} /> : n.tag === "clearance" ? <TrendingUp size={12} /> : <Sparkles size={12} />}
                  {n.tag}
                </Badge>
                <span className="text-xs text-slate-500">{new Date(n.created_at).toLocaleDateString()}</span>
              </div>
              <h3 className="font-semibold text-white mb-1.5">{n.title}</h3>
              {n.body && <p className="text-sm text-slate-400 mb-3">{n.body}</p>}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-3 border-t border-slate-800">
                <Store size={12} /> {n.shops?.name} <span className="mx-1">·</span> <MapPin size={11} /> {n.shops?.wilaya}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

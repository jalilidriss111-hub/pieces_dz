"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Badge, PrimaryButton, GhostButton, inputCls } from "@/components/ui";
import { PlusCircle, Send, Tag, TrendingUp, Sparkles, Store, MapPin, Archive, Clock, ArrowLeft } from "lucide-react";

const TAG_TONE: Record<string, "orange" | "found" | "pending"> = { arrival: "orange", promo: "found", clearance: "pending" };

export default function NewsPage() {
  const supabase = createClient();
  const [news, setNews] = useState<any[]>([]);
  const [archivedNews, setArchivedNews] = useState<any[]>([]);
  const [showArchive, setShowArchive] = useState(false);
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

    if (data) {
      const now = new Date().getTime();
      const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

      const recent: any[] = [];
      const archive: any[] = [];

      data.forEach((item) => {
        const itemTime = new Date(item.created_at).getTime();
        if (now - itemTime <= twentyFourHoursInMs) {
          recent.push(item);
        } else {
          archive.push(item);
        }
      });

      setNews(recent);
      setArchivedNews(archive);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: shop } = await supabase.from("shops").select("id").eq("owner_id", user.id).single();
      setHasShop(!!shop);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("news-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "news_posts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, supabase]);

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

  const currentList = showArchive ? archivedNews : news;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {showArchive ? "Archives des Nouveautés" : "Nouveautés (24h)"}
          </h1>
          <p className="text-slate-500 text-sm">
            {showArchive
              ? "Publications de plus de 24 heures"
              : "Arrivages, promotions et actus des dernières 24 heures"}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Archive Toggle Button */}
          <button
            onClick={() => setShowArchive((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            {showArchive ? (
              <>
                <ArrowLeft size={14} /> Voir récentes
              </>
            ) : (
              <>
                <Archive size={14} className="text-amber-400" />
                Archives ({archivedNews.length})
              </>
            )}
          </button>

          {hasShop && (
            <PrimaryButton onClick={() => setShowForm((s) => !s)} className="shrink-0 px-4 py-2 text-xs sm:text-sm">
              <PlusCircle size={15} /> Publier
            </PrimaryButton>
          )}
        </div>
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

      {currentList.length === 0 ? (
        <Card className="p-10 text-center text-slate-500 text-sm">
          {showArchive
            ? "Aucune publication archivée."
            : "Aucune actualité au cours des dernières 24 heures. Consultez les archives pour les anciennes annonces."}
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {currentList.map((n) => (
            <Card key={n.id} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <Badge tone={TAG_TONE[n.tag]}>
                  {n.tag === "promo" ? <Tag size={12} /> : n.tag === "clearance" ? <TrendingUp size={12} /> : <Sparkles size={12} />}
                  {n.tag}
                </Badge>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  <span className="ml-1">({new Date(n.created_at).toLocaleDateString()})</span>
                </span>
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

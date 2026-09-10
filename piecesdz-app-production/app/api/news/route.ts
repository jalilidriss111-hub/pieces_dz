import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { title, body: postBody, tag } = body;
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const { data: shop, error: shopError } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (shopError || !shop) {
    return NextResponse.json({ error: "You must register a shop before publishing news" }, { status: 403 });
  }

  const { data, error } = await supabase
  .from("news_posts")
  .insert([
    {
      shop_id: (shop as any).id,
      title,
      body: postBody ?? null,
      tag: tag ?? "arrival",
    },
  ] as any)
  .select()
  .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}

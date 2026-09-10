import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { shop_id } = await request.json();
  if (!shop_id) return NextResponse.json({ error: "shop_id required" }, { status: 400 });

  const { error } = await supabase.from("blocked_shops").insert([{ customer_id: user.id, shop_id }] as any);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { shop_id } = await request.json();
  if (!shop_id) return NextResponse.json({ error: "shop_id required" }, { status: 400 });

  const { error } = await supabase.from("blocked_shops").delete().eq("customer_id", user.id).eq("shop_id", shop_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

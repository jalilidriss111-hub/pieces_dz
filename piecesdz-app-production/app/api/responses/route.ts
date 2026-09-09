import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Called exclusively when a real shop owner clicks "Mark available" on
// their dashboard. No automated or scheduled process ever calls this.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { request_id, price, condition, note } = body;

  if (!request_id || !condition) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Confirm the caller actually owns a shop (defense in depth; RLS also checks this).
  const { data: shop, error: shopError } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (shopError || !shop) {
    return NextResponse.json({ error: "No shop found for this account" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("shop_responses")
    .upsert(
      { request_id, shop_id: shop.id, price: price ?? null, condition, note: note ?? null },
      { onConflict: "request_id,shop_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ response: data });
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { shop_id, rating, comment, request_id } = body;

  if (!shop_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reviews")
    .upsert(
      { shop_id, customer_id: user.id, rating, comment: comment ?? null, request_id: request_id ?? null },
      { onConflict: "shop_id,customer_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ review: data });
}

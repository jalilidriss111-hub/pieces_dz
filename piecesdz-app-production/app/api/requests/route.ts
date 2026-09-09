import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { brand, model, year, category, part_name, wilaya, all_algeria } = body;

  if (!brand || !model || !year || !category || !part_name || !wilaya) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("part_requests")
    .insert({
      customer_id: user.id,
      brand, model, year, category, part_name, wilaya,
      all_algeria: !!all_algeria,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count matching shops for the response summary shown to the customer.
  let matchQuery = supabase.from("shops").select("id", { count: "exact", head: true });
  if (!all_algeria) matchQuery = matchQuery.eq("wilaya", wilaya);
  const { count: matchingShops } = await matchQuery;

  return NextResponse.json({ request: data, matchingShops: matchingShops ?? 0 });
}

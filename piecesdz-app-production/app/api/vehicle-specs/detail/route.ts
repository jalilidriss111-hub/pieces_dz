import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Returns the complete spec profile for one exact engine (brand → model →
// generation → engine already resolved by the client via /api/vehicle-specs),
// plus its part references grouped by category. Every field the UI shows
// comes straight from these two queries — nothing is filled in or guessed
// here if a column is null.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const engineId = searchParams.get("engine_id");
  if (!engineId) return NextResponse.json({ error: "engine_id required" }, { status: 400 });

  const supabase = createClient();

  const { data: spec, error: specError } = await supabase
    .from("vehicle_spec_lookup")
    .select("*")
    .eq("engine_id", engineId)
    .single();

  if (specError) return NextResponse.json({ error: specError.message }, { status: 404 });

  const { data: partRefs, error: refsError } = await supabase
    .from("vehicle_part_references")
    .select("id, reference_type, brand_name, reference_number, notes, part_categories(name, slug)")
    .eq("engine_id", engineId);

  if (refsError) return NextResponse.json({ error: refsError.message }, { status: 500 });

  return NextResponse.json({ spec, partReferences: partRefs ?? [] });
}

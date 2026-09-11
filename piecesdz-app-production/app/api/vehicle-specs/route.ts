import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Powers the guided vehicle selector on /specs. Each level only queries
// once the previous one is selected, and returns real rows only — an
// empty array means "nothing in the database yet for this selection",
// which the UI must render honestly rather than falling back to any
// hardcoded list.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level"); // brands | models | generations | engines
  const brandId = searchParams.get("brand_id");
  const modelId = searchParams.get("model_id");
  const generationId = searchParams.get("generation_id");

  const supabase = createClient();

  if (level === "brands") {
    const { data, error } = await supabase
      .from("vehicle_brands")
      .select("id, name, origin_region")
      .order("name");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ brands: data });
  }

  if (level === "models") {
    if (!brandId) return NextResponse.json({ error: "brand_id required" }, { status: 400 });
    const { data, error } = await supabase
      .from("vehicle_models")
      .select("id, name, body_type")
      .eq("brand_id", brandId)
      .order("name");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ models: data });
  }

  if (level === "generations") {
    if (!modelId) return NextResponse.json({ error: "model_id required" }, { status: 400 });
    const { data, error } = await supabase
      .from("vehicle_generations")
      .select("id, name, year_start, year_end, doors, seats")
      .eq("model_id", modelId)
      .order("year_start");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ generations: data });
  }

  if (level === "engines") {
    if (!generationId) return NextResponse.json({ error: "generation_id required" }, { status: 400 });
    const { data, error } = await supabase
      .from("vehicle_engines")
      .select("id, engine_name, engine_code, fuel_type, power_hp")
      .eq("generation_id", generationId)
      .order("engine_name");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ engines: data });
  }

  return NextResponse.json({ error: "Invalid or missing level" }, { status: 400 });
}

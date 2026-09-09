import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase
    .from("part_requests")
    .update({ status: "closed" })
    .eq("id", params.id)
    .eq("customer_id", user.id); // RLS also enforces this; explicit for clarity

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

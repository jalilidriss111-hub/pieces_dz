import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Sign out error:", error.message);
  }

  const response = NextResponse.redirect(
    new URL("/login", request.url)
  );

  response.headers.set("Cache-Control", "no-store");

  return response;
}

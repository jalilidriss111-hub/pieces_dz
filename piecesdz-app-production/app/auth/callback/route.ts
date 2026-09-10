import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", request.url)
    );
  }

  const supabase = createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback error:", error.message);

    return NextResponse.redirect(
      new URL("/login?error=auth_failed", request.url)
    );
  }

 const response = NextResponse.redirect(
  "https://pieces-dz.onrender.com/dashboard"
);

  response.headers.set("Cache-Control", "no-store");

  return response;
}

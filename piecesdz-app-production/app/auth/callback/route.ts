import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  const SITE_URL = "https://pieces-dz.onrender.com";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${SITE_URL}/settings`);
    }
  }

  return NextResponse.redirect(`${SITE_URL}/login?error=auth_failed`);
}

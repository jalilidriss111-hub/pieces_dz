"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success the browser is redirected to Google, then back to
    // /auth/callback — no further client code runs here.
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-orange-500 mx-auto mb-5 flex items-center justify-center">
          <span className="text-slate-950 font-bold text-lg">P</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">PiecesDZ</h1>
        <p className="text-sm text-slate-500 mb-8">Sign in to search parts or manage your shop.</p>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-medium rounded-xl py-3 hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.5-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 16.3 3 9.7 7.4 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 45c5.4 0 10.3-2.1 14-5.5l-6.5-5.5C29.5 35.9 26.9 37 24 37c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.6 40.5 16.2 45 24 45z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C41.4 36 44 30.5 44 24c0-1.4-.1-2.5-.4-3.5z" />
          </svg>
          {loading ? "Redirecting..." : "Continue with Google"}
        </button>

        {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

        <p className="text-xs text-slate-600 mt-8">
          By continuing you agree to PiecesDZ's terms of service.
        </p>
      </div>
    </div>
  );
}

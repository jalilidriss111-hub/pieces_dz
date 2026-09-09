import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-slate-900/60 border border-slate-800 rounded-2xl ${className}`}>{children}</div>;
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "pending" | "found" | "closed" | "orange" }) {
  const tones: Record<string, string> = {
    default: "bg-slate-800 text-slate-300 border-slate-700",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    found: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    closed: "bg-slate-700/40 text-slate-400 border-slate-600",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${tones[tone]}`}>
      {children}
    </span>
  );
}

export const inputCls =
  "w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors";
export const selectCls = inputCls + " appearance-none";

export function PrimaryButton({
  children, className = "", disabled, type = "button", onClick,
}: { children: ReactNode; className?: string; disabled?: boolean; type?: "button" | "submit"; onClick?: () => void }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-500 text-slate-950 font-semibold hover:bg-orange-400 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children, className = "", onClick, type = "button",
}: { children: ReactNode; className?: string; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-700 text-slate-200 font-medium hover:border-slate-500 hover:bg-slate-800/50 active:scale-[0.98] transition-all ${className}`}
    >
      {children}
    </button>
  );
}

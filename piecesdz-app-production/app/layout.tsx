import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "PiecesDZ — Trouvez la pièce, pas la panne",
  description: "Connect Algerian car owners with parts shops, wreckers and suppliers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <NavBar />
        {children}
      </body>
    </html>
  );
}

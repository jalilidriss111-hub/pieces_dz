import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

// رابط الصورة المباشر من مجلد public
const ogImageUrl = "https://pieces-dz.onrender.com/og-image.jpg"; 

export const metadata: Metadata = {
  title: "PiecesDZ — Demandez vos pièces auto en Algérie | طلب قطع الغيار",
  description: "Connectez-vous avec les vendeurs, casses et ateliers en Algérie. Publiez votre demande de pièce auto, recevez des offres réelles et évaluez votre expérience.",
  keywords: [
    "PiecesDZ",
    "demande piece auto algerie",
    "vendeurs pieces detachees algerie",
    "casserie auto algerie",
    "قطع غيار السيارات الجزائر",
    "طلب قطع غيار",
    "كاس السيارات الجزائر",
    "ateliers auto algerie",
    "pieces de rechange dz"
  ],
  authors: [{ name: "PiecesDZ" }],
  openGraph: {
    title: "PiecesDZ — Publiez et trouvez vos pièces auto en Algérie",
    description: "Publiez votre demande, recevez des réponses de vendeurs inscrits, casses et ateliers partout en Algérie.",
    url: "https://pieces-dz.onrender.com/",
    siteName: "PiecesDZ",
    locale: "fr_DZ",
    type: "website",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "PiecesDZ - Plateforme de pièces auto en Algérie",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PiecesDZ — Trouvez vos pièces auto en Algérie",
    description: "Publiez votre demande de pièce auto et recevez des offres réelles.",
    images: [ogImageUrl],
  },
  robots: {
    index: true,
    follow: true,
  },
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

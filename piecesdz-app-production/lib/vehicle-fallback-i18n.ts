// Minimal, isolated i18n dictionary for the manual "vehicle not found"
// fallback control. The rest of the app is French-only for now; this file
// exists so the fallback ships correctly in all three required languages
// without forcing a full i18n rewrite in this pass.
//
// If/when full multi-language support is added, merge this into that
// system and delete this file.

export type Lang = "fr" | "ar" | "en";

export const VEHICLE_FALLBACK_STRINGS: Record<Lang, {
  carNotFound: string;
  manualEntryTitle: string;
  backToList: string;
  brand: string;
  model: string;
  year: string;
  brandPlaceholder: string;
  modelPlaceholder: string;
  yearPlaceholder: string;
  next: string;
}> = {
  fr: {
    carNotFound: "Véhicule non trouvé — saisie manuelle",
    manualEntryTitle: "Saisir mon véhicule manuellement",
    backToList: "Retour à la liste",
    brand: "Marque",
    model: "Modèle",
    year: "Année de fabrication",
    brandPlaceholder: "Ex. Mahindra, Great Wall, JAC...",
    modelPlaceholder: "Ex. Scorpio, Wingle 5...",
    yearPlaceholder: "Ex. 2015",
    next: "Suivant",
  },
  ar: {
    carNotFound: "لم أجد سيارتي — إدخال يدوي",
    manualEntryTitle: "إدخال بيانات سيارتي يدوياً",
    backToList: "العودة إلى القائمة",
    brand: "العلامة",
    model: "الطراز",
    year: "سنة الصنع",
    brandPlaceholder: "مثال: Mahindra، Great Wall، JAC...",
    modelPlaceholder: "مثال: Scorpio، Wingle 5...",
    yearPlaceholder: "مثال: 2015",
    next: "التالي",
  },
  en: {
    carNotFound: "Car not found — enter manually",
    manualEntryTitle: "Enter my vehicle manually",
    backToList: "Back to the list",
    brand: "Brand",
    model: "Model",
    year: "Year of manufacture",
    brandPlaceholder: "e.g. Mahindra, Great Wall, JAC...",
    modelPlaceholder: "e.g. Scorpio, Wingle 5...",
    yearPlaceholder: "e.g. 2015",
    next: "Next",
  },
};

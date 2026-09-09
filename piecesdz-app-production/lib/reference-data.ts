// Reference/taxonomy data only — brands, models, categories, wilayas.
// This is NOT mock business data (no fake shops, requests, reviews, or
// news). It's the equivalent of a static lookup table any real app needs
// to populate dropdowns, exactly like a country/currency list.

export const WILAYAS = [
  "Adrar","Chlef","Laghouat","Oum El Bouaghi","Batna","Béjaïa","Biskra","Béchar",
  "Blida","Bouira","Tamanrasset","Tébessa","Tlemcen","Tiaret","Tizi Ouzou","Alger",
  "Djelfa","Jijel","Sétif","Saïda","Skikda","Sidi Bel Abbès","Annaba","Guelma",
  "Constantine","Médéa","Mostaganem","M'Sila","Mascara","Ouargla","Oran","El Bayadh",
  "Illizi","Bordj Bou Arréridj","Boumerdès","El Tarf","Tindouf","Tissemsilt","El Oued",
  "Khenchela","Souk Ahras","Tipaza","Mila","Aïn Defla","Naâma","Aïn Témouchent",
  "Ghardaïa","Relizane",
];

export const BRANDS = [
  "Renault","Peugeot","Volkswagen","Hyundai","Toyota","Dacia","Kia","Fiat",
  "Chevrolet","Seat","Citroën","Nissan","Suzuki","Skoda",
];

export const MODELS: Record<string, string[]> = {
  Renault: ["Symbol","Clio 4","Mégane","Kangoo","Sandero"],
  Peugeot: ["208","301","3008","Partner"],
  Volkswagen: ["Golf 7","Polo","Passat","Tiguan"],
  Hyundai: ["Accent RB","Elantra","Tucson","i10"],
  Toyota: ["Corolla","Yaris","Hilux","Land Cruiser"],
  Dacia: ["Logan","Duster","Sandero"],
  Kia: ["Picanto","Sportage","Cerato"],
  Fiat: ["Tipo","Punto","Doblo"],
  Chevrolet: ["Aveo","Cruze","Spark"],
  Seat: ["Ibiza","Leon"],
  Citroën: ["C3","C-Elysée","Berlingo"],
  Nissan: ["Sunny","Qashqai","Micra"],
  Suzuki: ["Swift","Vitara"],
  Skoda: ["Octavia","Fabia"],
};

export const YEARS: number[] = [];
for (let y = 2060; y >= 1970; y--) YEARS.push(y);

export const CATEGORY_TREE = [
  {
    id: "engine", label: "Moteur & Transmission",
    parts: ["Filtre à huile","Filtre à air","Filtre à carburant","Courroie de distribution",
      "Pompe à eau","Joint de culasse","Bougies d'allumage","Capteur PMH","Turbo",
      "Injecteur","Support moteur","Radiateur","Durite de refroidissement","Alternateur",
      "Démarreur","Embrayage complet","Boîte de vitesses","Cardan"],
  },
  {
    id: "body", label: "Carrosserie & Extérieur",
    parts: ["Pare-chocs avant","Pare-chocs arrière","Capot moteur","Aile avant droite",
      "Aile avant gauche","Portière avant","Portière arrière","Hayon coffre","Calandre",
      "Rétroviseur extérieur","Poignée de porte","Baguette latérale","Passage de roue"],
  },
  {
    id: "glass", label: "Vitrage & Rétroviseurs",
    parts: ["Pare-brise","Vitre latérale avant","Vitre latérale arrière","Lunette arrière",
      "Rétroviseur intérieur","Vitre de custode","Joint de pare-brise","Essuie-glace"],
  },
  {
    id: "suspension", label: "Suspension & Freinage",
    parts: ["Amortisseur avant","Amortisseur arrière","Ressort de suspension","Rotule de direction",
      "Triangle de suspension","Disque de frein avant","Disque de frein arrière","Plaquette de frein",
      "Étrier de frein","Flexible de frein","Roulement de roue","Biellette de barre stabilisatrice"],
  },
  {
    id: "electrical", label: "Électricité & Intérieur",
    parts: ["Batterie","Faisceau électrique","Calculateur moteur (ECU)","Capteur ABS",
      "Capteur de température","Commodo","Vitre lève-glace électrique","Autoradio",
      "Siège avant","Ceinture de sécurité","Airbag","Tableau de bord","Klaxon","Phare avant","Feu arrière"],
  },
  {
    id: "maintenance", label: "Entretien",
    parts: ["Huile moteur 5W30","Liquide de frein","Liquide de refroidissement","Balai d'essuie-glace",
      "Ampoule H7","Fusible","Kit de distribution","Filtre d'habitacle"],
  },
];

export const SHOP_CATEGORIES: { value: string; label: string }[] = [
  { value: "new_parts", label: "Pièces neuves" },
  { value: "wrecker", label: "Casse / Occasion" },
  { value: "bodywork", label: "Carrosserie / Vitrage" },
  { value: "mechanical", label: "Mécanique / Moteur" },
  { value: "accessories", label: "Accessoires" },
];

export const CONDITIONS: { value: string; label: string }[] = [
  { value: "new", label: "Neuf" },
  { value: "original", label: "Origine" },
  { value: "used", label: "Occasion" },
  { value: "aftermarket", label: "Adaptable" },
];

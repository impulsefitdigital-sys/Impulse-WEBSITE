// Libellés des anciennes catégories de réalisation, saisies comme identifiants (« salle-de-sport »).
export const REALISATION_CATEGORY_LABELS: Record<string, string> = {
  "salle-de-sport": "Salle de sport",
  "home-gym": "Home gym",
  domicile: "Domicile",
  hotel: "Hôtel",
  "centre-de-loisirs": "Centre de loisirs",
};

export const realisationCategoryLabel = (category: string) => REALISATION_CATEGORY_LABELS[category] || category;
